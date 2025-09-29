import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { companyDocsService } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FolderIcon, 
  FolderOpenIcon, 
  DocumentIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  FolderPlusIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  FolderIcon as FolderSolid,
  DocumentIcon as DocumentSolid
} from '@heroicons/react/24/solid';
import { ChevronRightIcon as ChevronRightSolid } from '@heroicons/react/24/solid';

const ItemTypes = {
  FOLDER: 'folder',
  FILE: 'file'
};

// Drag and Drop Item Component
const DraggableItem = ({ 
  item, 
  path, 
  depth = 0,
  onMove, 
  onReorder, 
  onRename, 
  onDelete, 
  onToggle, 
  onShowProperties,
  onShare,
  onDownload,
  onDragStart,
  onDragEnd,
  viewMode = 'list',
  isSelected = false,
  onSelect,
  expandedFolders
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.title || item.name);
  const [isLoading, setIsLoading] = useState(false);
  const editInputRef = useRef(null);

  // Drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: item.type === 'FOLDER' ? ItemTypes.FOLDER : ItemTypes.FILE,
    item: () => {
      onDragStart?.(item);
      return { id: item.id, type: item.type, name: item.title || item.name };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDragEnd?.();
    }
  }), [item]);

  // Drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.FOLDER, ItemTypes.FILE],
    drop: (draggedItem, monitor) => {
      if (draggedItem.id !== item.id) {
        if (item.type === 'FOLDER') {
          // Move into folder
          onMove(draggedItem.id, item.id);
        } else {
          // Reorder in same level
          onReorder(draggedItem.id, item.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [item, onMove, onReorder]);

  // Combine drag and drop refs
  const ref = useRef(null);
  drag(drop(ref));

  const handleRename = async () => {
    if (editName.trim() && editName !== item.title) {
      setIsLoading(true);
      try {
        await companyDocsService.updateAsset(item.id, { title: editName.trim() });
        onRename(item.id, editName.trim());
        toast.success('Renamed successfully');
      } catch (error) {
        toast.error('Failed to rename item');
        setEditName(item.title || item.name);
      } finally {
        setIsLoading(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
      setEditName(item.title || item.name);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(item.title || item.name);
    }
  };

  const handleToggle = () => {
    if (item.type === 'FOLDER') {
      onToggle(item.id);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📋';
    return '📄';
  };

  const isFolder = item.type === 'FOLDER';
  const isExpanded = expandedFolders && expandedFolders.has(item.id);
  const IconComponent = isFolder ? (isExpanded ? FolderOpenIcon : FolderIcon) : DocumentIcon;
  const fileIcon = isFolder ? null : getFileIcon(item.mimeType);

  if (viewMode === 'grid') {
    return (
      <div
        ref={ref}
        className={`
          relative group cursor-pointer rounded-lg border-2 transition-all duration-200
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isOver && canDrop ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'}
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => onSelect?.(item)}
      >
        <div className="p-4 flex flex-col items-center text-center">
          <div className="mb-3">
            {isFolder ? (
              <IconComponent className={`w-12 h-12 ${isExpanded ? 'text-blue-600' : 'text-blue-500'}`} />
            ) : (
              <div className="text-4xl">{fileIcon}</div>
            )}
          </div>
          
          <div className="w-full">
            {isEditing ? (
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyPress={handleKeyPress}
                className="w-full text-sm font-medium text-center bg-transparent border-none outline-none"
                autoFocus
              />
            ) : (
              <div className="text-sm font-medium text-gray-900 mb-1 truncate" title={item.title || item.name}>
                {item.title || item.name}
              </div>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              {!isFolder && (
                <>
                  <div>{formatFileSize(item.fileSize)}</div>
                  <div>{formatDate(item.updatedAt || item.createdAt)}</div>
                </>
              )}
              {isFolder && item.children && (
                <div>{item.children.length} items</div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            {!isFolder && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(item);
                  }}
                  className="p-1 rounded bg-white shadow-sm hover:bg-gray-100"
                  title="Download"
                >
                  <ArrowDownTrayIcon className="w-3 h-3 text-gray-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.(item);
                  }}
                  className="p-1 rounded bg-white shadow-sm hover:bg-gray-100"
                  title="Share"
                >
                  <ShareIcon className="w-3 h-3 text-gray-600" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 rounded bg-white shadow-sm hover:bg-gray-100"
              title="Rename"
            >
              <PencilIcon className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="p-1 rounded bg-white shadow-sm hover:bg-red-100"
              title="Delete"
            >
              <TrashIcon className="w-3 h-3 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      ref={ref}
      className={`
        flex items-center py-2 px-3 rounded-lg transition-all duration-200 group
        ${isDragging ? 'opacity-50' : ''}
        ${isOver && canDrop ? 'bg-blue-50 border-l-4 border-blue-400' : ''}
        ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
        ${isLoading ? 'pointer-events-none opacity-60' : ''}
      `}
      style={{ paddingLeft: `${depth * 20 + 12}px` }}
      onClick={() => onSelect?.(item)}
    >
      {/* Expand/Collapse button for folders */}
      {isFolder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}

      {/* Icon */}
      <div className="mr-3 flex-shrink-0">
        {isFolder ? (
          <IconComponent className={`w-5 h-5 ${isExpanded ? 'text-blue-600' : 'text-blue-500'}`} />
        ) : (
          <div className="text-lg">{fileIcon}</div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyPress={handleKeyPress}
            className="w-full bg-transparent border-none outline-none text-sm font-medium"
            autoFocus
          />
        ) : (
          <div className="text-sm font-medium text-gray-900 truncate" title={item.title || item.name}>
            {item.title || item.name}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-6 text-xs text-gray-500">
        {!isFolder && (
          <>
            <div className="w-16 text-right">{formatFileSize(item.fileSize)}</div>
            <div className="w-32">{formatDate(item.updatedAt || item.createdAt)}</div>
          </>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isFolder && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.(item);
                }}
                className="p-1 rounded hover:bg-gray-200"
                title="Download"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(item);
                }}
                className="p-1 rounded hover:bg-gray-200"
                title="Share"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 rounded hover:bg-gray-200"
            title="Rename"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-1 rounded hover:bg-red-100"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Upload Progress Component
const UploadProgress = ({ uploads, onCancel }) => {
  if (!uploads || uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Uploading Files</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 truncate flex-1 mr-2">{upload.file.name}</span>
              <span className="text-gray-500">{upload.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  upload.status === 'error' ? 'bg-red-500' : 
                  upload.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            {upload.status === 'error' && (
              <div className="text-xs text-red-600">{upload.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Breadcrumb Component
const Breadcrumb = ({ path, onNavigate }) => {
  if (!path || path.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <FolderIcon className="w-4 h-4 text-gray-500" />
        <span className="text-gray-900 font-medium">Company Documents</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <button
        onClick={() => onNavigate([])}
        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <FolderIcon className="w-4 h-4" />
        <span>Company Documents</span>
      </button>
      
      {path.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <ChevronRightSolid className="w-3 h-3 text-gray-400" />
          <button
            onClick={() => onNavigate(path.slice(0, index + 1))}
            className={`flex items-center space-x-1 transition-colors ${
              index === path.length - 1 
                ? 'text-gray-900 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span>{folder.title || folder.name}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, title, message, confirmText = "Delete", onConfirm, onCancel, type = "danger" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            {type === "danger" && (
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            )}
            {type === "success" && (
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{title}</h3>
          <p className="text-sm text-gray-600 text-center mb-6">{message}</p>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                type === "danger" 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const AdvancedCompanyDocumentsPage = ({ colorMode }) => {
  // Core state
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [currentPath, setCurrentPath] = useState([]);
  
  // Upload state
  const [uploads, setUploads] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Load documents from API
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyDocsService.listAssets();
      
      if (response.success) {
        const assets = response.data.assets || [];
        // Convert to hierarchical structure
        const hierarchicalData = buildHierarchy(assets);
        setDocuments(hierarchicalData);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Build hierarchical structure from flat array
  const buildHierarchy = (items, parentId = null) => {
    const children = items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => {
        // Folders first, then files
        if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
        if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
        // Within same type, sort by sortOrder then by name
        if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
        return (a.title || a.name).localeCompare(b.title || b.name);
      })
      .map(item => ({
        ...item,
        children: buildHierarchy(items, item.id)
      }));
    
    return children;
  };

  // Initialize
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle drag and drop for file uploads
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  // File upload handling
  const handleFileUpload = async (files) => {
    const uploadPromises = files.map(file => uploadSingleFile(file));
    setUploads(prev => [...prev, ...files.map(file => ({ 
      id: file.name + Date.now(), 
      file, 
      progress: 0, 
      status: 'uploading' 
    }))]);
    
    try {
      await Promise.all(uploadPromises);
      toast.success(`Successfully uploaded ${files.length} file(s)`);
      loadDocuments(); // Reload documents
    } catch (error) {
      toast.error('Some files failed to upload');
    } finally {
      // Clear uploads after a delay
      setTimeout(() => {
        setUploads([]);
      }, 3000);
    }
  };

  const uploadSingleFile = async (file) => {
    try {
      await companyDocsService.uploadAsset(file, {
        title: file.name,
        section: 'company-docs'
      });
      
      // Update upload progress
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, progress: 100, status: 'success' }
          : upload
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, status: 'error', error: error.message }
          : upload
      ));
      throw error;
    }
  };

  // Folder operations
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await companyDocsService.createFolder({
        name: newFolderName.trim(),
        section: 'company-docs'
      });
      
      toast.success('Folder created successfully');
      setShowCreateFolder(false);
      setNewFolderName('');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  // Item operations
  const handleMove = async (itemId, targetFolderId) => {
    try {
      await companyDocsService.updateAsset(itemId, { parentId: targetFolderId });
      toast.success('Item moved successfully');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to move item');
      loadDocuments(); // Revert optimistic update
    }
  };

  const handleReorder = async (itemId, targetItemId) => {
    // Implementation for reordering items
    toast.success('Item reordered');
    loadDocuments();
  };

  const handleRename = (itemId, newName) => {
    // Optimistic update
    setDocuments(prev => updateItemInTree(prev, itemId, { title: newName }));
  };

  const handleDelete = async (item) => {
    setDeleteConfirm({
      item,
      title: `Delete ${item.type === 'FOLDER' ? 'Folder' : 'File'}`,
      message: `Are you sure you want to delete "${item.title || item.name}"? This action cannot be undone.`
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      if (deleteConfirm.item.type === 'bulk') {
        await confirmBulkDelete();
      } else {
        await companyDocsService.deleteAsset(deleteConfirm.item.id);
        toast.success('Item deleted successfully');
        loadDocuments();
      }
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggle = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleDownload = async (item) => {
    if (item.type === 'FOLDER') {
      toast.error('Cannot download folders');
      return;
    }

    try {
      const response = await companyDocsService.downloadAsset(item.id);
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.title || item.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleShare = (item) => {
    // Implementation for file sharing
    toast('Share functionality coming soon');
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    setDeleteConfirm({
      item: { id: 'bulk', title: 'Selected Items', type: 'bulk' },
      title: 'Delete Selected Items',
      message: `Are you sure you want to delete ${selectedItems.length} selected item(s)? This action cannot be undone.`
    });
  };

  const confirmBulkDelete = async () => {
    try {
      await companyDocsService.bulkDeleteAssets(selectedItems);
      toast.success(`Deleted ${selectedItems.length} item(s) successfully`);
      setSelectedItems([]);
      setShowBulkActions(false);
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete selected items');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleBulkMove = async (targetFolderId) => {
    if (selectedItems.length === 0) return;

    try {
      await companyDocsService.bulkMoveAssets(selectedItems, targetFolderId);
      toast.success(`Moved ${selectedItems.length} item(s) successfully`);
      setSelectedItems([]);
      setShowBulkActions(false);
      loadDocuments();
    } catch (error) {
      toast.error('Failed to move selected items');
    }
  };

  // Update selected items and bulk actions visibility
  useEffect(() => {
    setShowBulkActions(selectedItems.length > 0);
  }, [selectedItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + A - Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (documents.length > 0) {
          const allIds = [];
          const collectIds = (items) => {
            items.forEach(item => {
              allIds.push(item.id);
              if (item.children) {
                collectIds(item.children);
              }
            });
          };
          collectIds(documents);
          setSelectedItems(allIds);
        }
      }
      
      // Escape - Clear selection
      if (e.key === 'Escape') {
        setSelectedItems([]);
      }
      
      // Delete - Delete selected items
      if (e.key === 'Delete' && selectedItems.length > 0) {
        handleBulkDelete();
      }
      
      // Ctrl/Cmd + N - Create new folder
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateFolder(true);
      }
      
      // Ctrl/Cmd + U - Upload files
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, documents, handleBulkDelete]);

  // Helper function to update item in tree
  const updateItemInTree = (items, itemId, updates) => {
    return items.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      if (item.children) {
        return { ...item, children: updateItemInTree(item.children, itemId, updates) };
      }
      return item;
    });
  };

  // Render items recursively
  const renderItems = (items, depth = 0) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <DraggableItem
          item={item}
          path=""
          depth={depth}
          onMove={handleMove}
          onReorder={handleReorder}
          onRename={handleRename}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onShowProperties={() => {}}
          onShare={handleShare}
          onDownload={handleDownload}
          onSelect={(item) => {
            setSelectedItems(prev => 
              prev.includes(item.id) 
                ? prev.filter(id => id !== item.id)
                : [...prev, item.id]
            );
          }}
          viewMode={viewMode}
          isSelected={selectedItems.includes(item.id)}
          expandedFolders={expandedFolders}
        />
        {item.type === 'FOLDER' && expandedFolders.has(item.id) && item.children && item.children.length > 0 && (
          <div>
            {renderItems(item.children, depth + 1)}
          </div>
        )}
      </React.Fragment>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Documents</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your company files and folders</p>
              <div className="mt-2">
                <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-[var(--color-primary-blueprint-blue)] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-[var(--color-primary-blueprint-blue)] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
              </div>
              
              {/* Create Folder Button */}
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FolderPlusIcon className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              
              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-success-green)] text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {showBulkActions && (
          <div className="border-b border-gray-200 px-6 py-3 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.length} item(s) selected
                </span>
                <button
                  onClick={() => setSelectedItems([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement bulk move dialog
                    toast('Bulk move functionality coming soon');
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <FolderIcon className="w-4 h-4" />
                  <span>Move</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div 
          ref={dropZoneRef}
          className={`flex-1 overflow-auto transition-colors ${
            isDragOver ? 'bg-blue-50' : 'bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6">
            {error ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Documents</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={loadDocuments}
                  className="px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Yet</h3>
                <p className="text-gray-600 mb-6">Upload files or create folders to get started</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary-blueprint-blue)] text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <CloudArrowUpIcon className="w-4 h-4" />
                    <span>Upload Files</span>
                  </button>
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                    <span>Create Folder</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-1'}>
                {renderItems(documents)}
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files.length > 0) {
              handleFileUpload(Array.from(e.target.files));
            }
          }}
        />

        {/* Upload Progress */}
        <UploadProgress 
          uploads={uploads} 
          onCancel={() => setUploads([])} 
        />

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Folder</h3>
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  autoFocus
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blueprint-blue)] rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteConfirm}
          title={deleteConfirm?.title}
          message={deleteConfirm?.message}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          type="danger"
        />
      </div>
    </DndProvider>
  );
};

export default AdvancedCompanyDocumentsPage;
