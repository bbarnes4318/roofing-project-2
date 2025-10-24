import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { documentsService, API_ORIGIN } from '../../services/api';
import { assetsService } from '../../services/assetsService';
import toast from 'react-hot-toast';
import DocumentViewerModal from '../ui/DocumentViewerModal';
import {
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpTrayIcon,
  Squares2X2Icon,
  Bars3Icon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px]"
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
              : 'text-gray-700 hover:bg-gray-50'
          } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// Folder Tree Item
const FolderTreeItem = ({ folder, level = 0, isActive, onSelect, onContextMenu, draggingId }) => {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition group ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px`, opacity: draggingId === folder.id ? 0.5 : 1 }}
        onClick={() => onSelect(folder)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, folder);
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/folder-id', folder.id);
          e.stopPropagation();
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex-shrink-0 hover:bg-gray-200 rounded p-0.5"
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
        {expanded || isActive ? (
          <FolderOpenIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
        ) : (
          <FolderIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}
        <span className="text-sm truncate flex-1">{folder.name}</span>
        {hasChildren && <span className="text-xs text-gray-400">{folder.children.length}</span>}
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
              onContextMenu={onContextMenu}
              draggingId={draggingId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectDocumentsPage = ({ project, onBack, colorMode }) => {
  const queryClient = useQueryClient();
  
  // Local state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('Technical');
  const [uploadDescription, setUploadDescription] = useState('');
  const [view, setView] = useState('grid');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [draggingId, setDraggingId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef(null);
  
  // Document modal state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  
  // Mock folder structure (you'll need to implement actual backend for this)
  const [folders, setFolders] = useState([
    {
      id: 'legal',
      name: 'Legal Documents',
      parentId: null,
      children: []
    },
    {
      id: 'technical',
      name: 'Technical Specs',
      parentId: null,
      children: []
    },
    {
      id: 'photos',
      name: 'Photos & Videos',
      parentId: null,
      children: []
    }
  ]);

  // Fetch documents from both Document table AND CompanyAssets with matching projectId
  const { data: documentsData, isLoading, error } = useQuery({
    queryKey: ['projectDocuments', project?.id, currentFolderId],
    queryFn: async () => {
      if (!project?.id) return [];
      
      try {
        // Fetch from Document table (project-specific documents)
        const docResponse = await api.get(`/documents/project/${project.id}`);
        // Backend returns { success: true, data: { documents: [...] } }
        const projectDocs = Array.isArray(docResponse.data?.data?.documents)
          ? docResponse.data.data.documents
          : [];

        // Fetch from CompanyAssets with projectId in metadata
        // Note: This requires backend support for metadata queries
        // For now, we'll fetch all assets and filter client-side
        let companyAssetDocs = [];
        try {
          const assetsResponse = await assetsService.list({ limit: 1000 });
          const assets = Array.isArray(assetsResponse?.assets) ? assetsResponse.assets : [];
          // Filter assets that have this project's ID in metadata
          companyAssetDocs = assets
            .filter(asset =>
              asset.type === 'FILE' &&
              asset.metadata?.projectId === project.id
            )
            .map(asset => ({
              ...asset,
              name: asset.title,
              fileName: asset.title,
              fileUrl: asset.fileUrl,
              size: asset.fileSize,
              createdAt: asset.createdAt,
              _source: 'companyAsset' // Mark source for identification
            }));
        } catch (assetErr) {
          console.warn('Failed to fetch company assets:', assetErr);
        }

        // Combine both sources
        return [...projectDocs, ...companyAssetDocs];
      } catch (err) {
        console.error('Error fetching project documents:', err);
        throw err;
      }
    },
    enabled: !!project?.id
  });
  
  // Normalize documents
  const allDocuments = Array.isArray(documentsData)
    ? documentsData
    : Array.isArray(documentsData?.data)
      ? documentsData.data
      : Array.isArray(documentsData?.documents)
        ? documentsData.documents
        : [];

  // Filter documents by folder
  const documents = useMemo(() => {
    return allDocuments.filter(doc => {
      const matchesFolder = !currentFolderId || doc.folderId === currentFolderId;
      const matchesSearch = !searchTerm || 
        (doc?.name || doc?.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [allDocuments, currentFolderId, searchTerm]);

  const getFileIcon = (filename = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📑';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📎';
    }
  };

  // Upload mutation - uploads to BOTH Document table AND CompanyAssets
  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const files = formData.getAll('files');
      if (!files || files.length === 0) {
        throw new Error('No files selected');
      }

      const uploadedDocs = [];

      // Upload each file to BOTH systems
      for (const file of files) {
        // 1. Upload to Document table (project-specific documents)
        const docFormData = new FormData();
        docFormData.append('file', file);
        docFormData.append('projectId', project.id);
        docFormData.append('fileName', file.name);
        docFormData.append('description', uploadDescription || 'No description provided');
        docFormData.append('fileType', uploadCategory || 'OTHER');
        docFormData.append('tags', JSON.stringify([]));
        docFormData.append('isPublic', 'false');
        // uploadedById will be set from req.user on backend

        const docResponse = await api.post('/documents', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // 2. Also upload to CompanyAssets with projectId metadata for Documents & Resources sync
        try {
          await assetsService.uploadFiles({
            files: [file],
            metadata: {
              projectId: project?.id,
              projectNumber: project?.projectNumber,
              category: uploadCategory,
              source: 'projectDocuments',
              documentId: docResponse.data?.data?.id // Link to Document table entry
            },
            description: uploadDescription || `Project ${project?.projectNumber} documents`
          });
        } catch (assetErr) {
          console.warn('Failed to sync to CompanyAssets:', assetErr);
          // Don't fail the entire upload if CompanyAsset sync fails
        }

        uploadedDocs.push(docResponse.data);
      }

      return { success: true, data: uploadedDocs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectDocuments', project?.id]);
      toast.success('Documents uploaded successfully!');
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadCategory('Technical');
      setUploadDescription('');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.response?.data?.message || error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await api.delete(`/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectDocuments', project?.id]);
      toast.success('Document deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0 || !project?.id) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('projectId', project.id);
    formData.append('category', uploadCategory);
    formData.append('description', uploadDescription || 'No description provided');

    uploadMutation.mutate(formData);
  };

  const handleDelete = (documentId) => {
    if (!documentId) return;
    deleteMutation.mutate(documentId);
  };

  const resolveDocumentName = (doc) => doc?.name || doc?.fileName || doc?.originalName || 'Untitled Document';

  const formatFileSize = (bytes) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) {
      return '—';
    }
    if (size < 1024) return `${size} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
  };

  const buildDocumentUrl = (doc) => {
    if (!doc?.fileUrl) return null;
    if (/^https?:/i.test(doc.fileUrl)) return doc.fileUrl;
    return `${API_ORIGIN}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`;
  };

  const handleDownload = async (doc) => {
    if (!doc?.id) {
      toast.error('Document id missing.');
      return;
    }
    try {
      const response = await documentsService.download(doc.id);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resolveDocumentName(doc);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Document download failed:', downloadError);
      toast.error('Unable to download document.');
    }
  };

  const handleView = async (doc) => {
    const directUrl = buildDocumentUrl(doc);

    try {
      if (directUrl) {
        // Create document object for modal
        const documentForModal = {
          ...doc,
          url: directUrl,
          fileName: doc.fileName || doc.name || 'Document'
        };
        
        setSelectedDocument(documentForModal);
        setIsDocumentModalOpen(true);
        return;
      }

      if (!doc?.id) {
        toast.error('Document id missing.');
        return;
      }

      const response = await documentsService.download(doc.id);
      const blobUrl = window.URL.createObjectURL(response.data);
      
      // Create document object for modal
      const documentForModal = {
        ...doc,
        url: blobUrl,
        fileName: doc.fileName || doc.name || 'Document'
      };
      
      setSelectedDocument(documentForModal);
      setIsDocumentModalOpen(true);
      
      // Clean up blob URL after modal closes
      setTimeout(() => {
        if (!isDocumentModalOpen) {
          window.URL.revokeObjectURL(blobUrl);
        }
      }, 60000);
    } catch (viewError) {
      console.error('Document view failed:', viewError);
      toast.error('Unable to open document preview.');
    }
  };

  // Folder management functions
  const createFolder = () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name,
      parentId: currentFolderId,
      children: []
    };
    
    setFolders([...folders, newFolder]);
    toast.success('Folder created!');
  };

  const renameFolder = (folder) => {
    const name = prompt('Enter new folder name:', folder.name);
    if (!name || name === folder.name) return;
    
    setFolders(folders.map(f => f.id === folder.id ? { ...f, name } : f));
    toast.success('Folder renamed!');
  };

  const deleteFolder = (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;
    
    setFolders(folders.filter(f => f.id !== folder.id));
    if (currentFolderId === folder.id) {
      setCurrentFolderId(null);
    }
    toast.success('Folder deleted!');
  };

  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: 'Rename',
          icon: PencilIcon,
          onClick: () => renameFolder(folder)
        },
        {
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => deleteFolder(folder),
          danger: true
        }
      ]
    });
  };

  const handleDocumentContextMenu = (e, doc) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: 'View',
          onClick: () => handleView(doc)
        },
        {
          label: 'Download',
          onClick: () => handleDownload(doc)
        },
        {
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => handleDelete(doc.id),
          danger: true
        }
      ]
    });
  };

  const handleItemClick = (item, e) => {
    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(new Set([item.id]));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setSelectedItems(new Set());
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItems.size > 0) {
        e.preventDefault();
        if (window.confirm(`Delete ${selectedItems.size} item(s)?`)) {
          selectedItems.forEach(id => {
            const doc = documents.find(d => d.id === id);
            if (doc) handleDelete(id);
          });
          setSelectedItems(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, documents]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Folders</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-2 ${
                !currentFolderId ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FolderIcon className="h-4 w-4" />
              <span className="text-sm font-medium">All Documents</span>
            </button>
            {folders.map((folder) => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                isActive={currentFolderId === folder.id}
                onSelect={(f) => setCurrentFolderId(f.id)}
                onContextMenu={handleFolderContextMenu}
                draggingId={draggingId}
              />
            ))}
          </div>
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={createFolder}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-sm font-medium">New Folder</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Bars3Icon className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentFolderId 
                      ? folders.find(f => f.id === currentFolderId)?.name 
                      : 'All Documents'}
                  </h1>
                  <p className="text-sm text-gray-600">{project?.name || 'Project Name'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title={view === 'grid' ? 'List view' : 'Grid view'}
                >
                  {view === 'grid' ? (
                    <Bars3Icon className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Squares2X2Icon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span className="font-medium">Upload</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="mt-3 flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {selectedItems.size} selected
                </span>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-lg text-gray-700">Loading...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-12 text-red-600">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Error Loading Documents</h3>
              <p className="mb-4">{error.message}</p>
            </div>
          )}

          {/* Documents */}
          {!isLoading && !error && (
            <>
              {documents.length === 0 ? (
                <div className="text-center py-16">
                  <DocumentIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No documents yet</h3>
                  <p className="text-gray-500 mb-6">Upload your first document to get started</p>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Upload Documents
                  </button>
                </div>
              ) : (
                <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
                  {documents.map(doc => {
                    const isSelected = selectedItems.has(doc.id);
                    const isDragging = draggingId === doc.id;
                    const displayName = doc?.name || doc?.fileName || doc?.originalName || 'Untitled';

                    return (
                      <div
                        key={doc.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/doc-id', doc.id);
                          setDraggingId(doc.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={(e) => handleItemClick(doc, e)}
                        onContextMenu={(e) => handleDocumentContextMenu(e, doc)}
                        className={`group relative p-4 rounded-xl border-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        } ${isDragging ? 'opacity-50' : ''}`}
                      >
                        {view === 'grid' ? (
                          <div className="text-center">
                            <DocumentIcon className={`h-12 w-12 mx-auto mb-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <h4 className="text-sm font-semibold text-gray-900 truncate mb-1" title={displayName}>
                              {displayName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.size || doc.fileSize)}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentContextMenu(e, doc);
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-gray-100 rounded-lg shadow-sm transition"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <DocumentIcon className={`h-6 w-6 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(doc.size || doc.fileSize)}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentContextMenu(e, doc);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${colorMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Documents
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className={`p-1 rounded-lg transition-colors duration-200 ${
                  colorMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Select Files
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                    colorMode
                      ? 'border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
                  }`}
                >
                  <div className="text-3xl mb-2">📤</div>
                  <p className="text-sm">Click to select files or drag and drop</p>
                  <p className="text-xs mt-1">Supports PDF, DOC, XLS, images, and more</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="Technical">Technical Specs</option>
                  <option value="Legal">Legal Documents</option>
                  <option value="Safety">Safety & Compliance</option>
                  <option value="Visual">Photos & Videos</option>
                  <option value="Financial">Financial Records</option>
                  <option value="Communication">Communication</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the documents..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors duration-200 resize-none ${
                    colorMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                    colorMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                  className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 ${
                    selectedFiles.length === 0 || uploadMutation.isPending
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-[var(--color-primary-blueprint-blue)] hover:bg-blue-700 text-white'
                  }`}
                >
                  {uploadMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        document={selectedDocument}
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument(null);
        }}
      />
    </div>
  );
};

export default ProjectDocumentsPage;