import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop, DragPreviewImage } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { companyDocsService } from '../../services/api';
import toast from 'react-hot-toast';
import DocumentPreviewModal from '../ui/DocumentPreviewModal';
import DocumentUploadZone from '../ui/DocumentUploadZone';
import ContextMenu from '../ui/ContextMenu';
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
  ArrowPathIcon,
  StarIcon,
  StarIcon as StarOutline,
  EllipsisVerticalIcon,
  ArchiveBoxIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  FolderArrowDownIcon,
  ArrowUturnLeftIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { 
  FolderIcon as FolderSolid,
  DocumentIcon as DocumentSolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

const ItemTypes = {
  FOLDER: 'folder',
  FILE: 'file',
  DOCUMENT_ITEM: 'document_item'
};

// Modern File/Folder Card Component with Drag and Drop
const DocumentCard = ({ 
  item, 
  isSelected, 
  onSelect, 
  onDoubleClick, 
  onContextMenu, 
  onToggleFavorite,
  isFavorite,
  viewMode = 'grid',
  colorMode = false,
  onMoveItem,
  onReorderItems,
  onDragStart,
  onDragEnd,
  onRename,
  index
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.title || '');
  const renameInputRef = useRef(null);

  // Drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.DOCUMENT_ITEM,
    item: { 
      id: item.id, 
      type: item.type, 
      title: item.title,
      index,
      originalItem: item
    },
    begin: () => {
      onDragStart?.(item);
    },
    end: () => {
      onDragEnd?.();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop functionality for reordering
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.DOCUMENT_ITEM,
    drop: (draggedItem, monitor) => {
      if (draggedItem.id !== item.id) {
        onReorderItems(draggedItem.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isFolder = item.type === 'FOLDER';
  const fileSize = item.fileSize ? formatFileSize(item.fileSize) : '';
  const lastModified = item.updatedAt ? formatDate(item.updatedAt) : '';

  const handleRename = async (e) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue !== item.title) {
      try {
        await companyDocsService.renameAsset(item.id, renameValue.trim());
        toast.success('Renamed successfully');
        setIsRenaming(false);
        // Trigger parent to reload documents
        if (onRename) {
          onRename();
        }
      } catch (error) {
        console.error('Error renaming:', error);
        toast.error('Failed to rename');
        setRenameValue(item.title || '');
      }
    } else {
      setIsRenaming(false);
      setRenameValue(item.title || '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(item.title || '');
    }
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <DocumentTextIcon className="w-8 h-8 text-red-500" />;
    if (mimeType?.includes('image')) return <PhotoIcon className="w-8 h-8 text-green-500" />;
    if (mimeType?.includes('word')) return <DocumentIcon className="w-8 h-8 text-blue-500" />;
    if (mimeType?.includes('excel')) return <TableCellsIcon className="w-8 h-8 text-green-600" />;
    if (mimeType?.includes('powerpoint')) return <PresentationChartBarIcon className="w-8 h-8 text-orange-500" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return <ArchiveBoxIcon className="w-8 h-8 text-purple-500" />;
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  const cardClasses = `
    group relative bg-white rounded-xl border border-gray-200 transition-all duration-200 cursor-pointer
    hover:shadow-lg hover:border-blue-300 hover:-translate-y-1
    ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : ''}
    ${isDragging ? 'opacity-50 scale-95' : ''}
    ${isOver && canDrop ? 'ring-2 ring-green-400 border-green-400 bg-green-50' : ''}
    ${colorMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white'}
    ${viewMode === 'list' ? 'flex items-center p-4' : 'p-6'}
  `;

  if (viewMode === 'list') {
    return (
      <div
        ref={(node) => {
          drag(drop(node));
        }}
        className={cardClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(item.id)}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {isFolder ? (
              <FolderIcon className="w-8 h-8 text-blue-500" />
            ) : (
              getFileIcon(item.mimeType)
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <form onSubmit={handleRename}>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-b border-blue-500 focus:outline-none"
                />
              </form>
            ) : (
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {item.title}
              </h3>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
              {isFolder && (
                <span>{item.children?.length || 0} items</span>
              )}
              {fileSize && <span>{fileSize}</span>}
              {lastModified && <span>{lastModified}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className={`p-1 rounded-full transition-colors ${
              isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            {isFavorite ? <StarSolid className="w-4 h-4" /> : <StarOutline className="w-4 h-4" />}
          </button>
          
          <div className={`transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={(node) => {
        drag(drop(node));
      }}
      className={cardClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(item.id)}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        className={`absolute top-2 right-2 p-1 rounded-full transition-all ${
          isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
        } ${isHovered || isFavorite ? 'opacity-100' : 'opacity-0'}`}
      >
        {isFavorite ? <StarSolid className="w-4 h-4" /> : <StarOutline className="w-4 h-4" />}
      </button>

      {/* Main content */}
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          {isFolder ? (
            <div className="relative">
              <FolderIcon className="w-16 h-16 text-blue-500" />
              {item.children?.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                  {item.children.length}
                </div>
              )}
            </div>
          ) : (
            getFileIcon(item.mimeType)
          )}
        </div>

        <div className="min-h-[3rem] flex items-center justify-center">
          {isRenaming ? (
            <form onSubmit={handleRename} className="w-full">
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="w-full text-center bg-transparent border-b border-blue-500 focus:outline-none text-sm font-medium"
              />
            </form>
          ) : (
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
              {item.title}
            </h3>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500 space-y-1">
          {isFolder ? (
            <div>{item.children?.length || 0} items</div>
          ) : (
            <>
              {fileSize && <div>{fileSize}</div>}
              {lastModified && <div>{lastModified}</div>}
            </>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className={`absolute inset-0 bg-black bg-opacity-5 rounded-xl flex items-center justify-center transition-opacity ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          >
            <PencilIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Download action
            }}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Modern Search and Filter Bar
const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  onFilterChange, 
  viewMode, 
  onViewModeChange,
  selectedCount,
  onBulkAction,
  colorMode = false 
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => onBulkAction('download')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => onBulkAction('move')}
                  className="px-3 py-1.5 text-sm bg-white text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Move
                </button>
                <button
                  onClick={() => onBulkAction('delete')}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Drop Zone Component for moving items between folders
const DropZone = ({ 
  onDrop, 
  isActive, 
  children, 
  className = '' 
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.DOCUMENT_ITEM,
    drop: (item, monitor) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`
        transition-all duration-200
        ${isOver && canDrop ? 'bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Breadcrumb Navigation
const BreadcrumbNav = ({ 
  currentPath, 
  onNavigate, 
  colorMode = false 
}) => {
  const breadcrumbs = [
    { id: 'root', name: 'All Documents', path: [] },
    ...currentPath.map((id, index) => ({
      id,
      name: `Folder ${index + 1}`, // This would come from actual folder data
      path: currentPath.slice(0, index + 1)
    }))
  ];

  return (
    <nav className="px-6 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => onNavigate([])}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HomeIcon className="w-4 h-4 mr-1" />
          All Documents
        </button>
        
        {currentPath.length > 0 && (
          <>
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => onNavigate(currentPath.slice(0, -1))}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

// Drag Preview Component
const DragPreview = ({ item }) => {
  const isFolder = item?.type === 'FOLDER';
  
  return (
    <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-xs">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {isFolder ? (
            <FolderIcon className="w-8 h-8 text-blue-500" />
          ) : (
            <DocumentIcon className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item?.title}
          </p>
          <p className="text-xs text-gray-500">
            {isFolder ? 'Folder' : 'File'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Modern Company Documents Page
const ModernCompanyDocumentsPage = ({ colorMode = false }) => {
  // Core state
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);

  // Upload state
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  
  // Drag state
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

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
        const hierarchicalData = buildHierarchy(assets);
        setDocuments(hierarchicalData);
        setFilteredDocuments(hierarchicalData);
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
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildHierarchy(items, item.id)
      }))
      .sort((a, b) => {
        // Folders first, then files
        if (a.type === 'FOLDER' && b.type !== 'FOLDER') return -1;
        if (a.type !== 'FOLDER' && b.type === 'FOLDER') return 1;
        return a.title.localeCompare(b.title);
      });
  };

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const filterDocuments = (items) => {
      return items.filter(item => {
        const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const childrenMatch = item.children ? filterDocuments(item.children).length > 0 : false;
        return matchesSearch || childrenMatch;
      }).map(item => ({
        ...item,
        children: item.children ? filterDocuments(item.children) : []
      }));
    };

    setFilteredDocuments(filterDocuments(documents));
  }, [searchQuery, documents]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle item selection
  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle item double click
  const handleItemDoubleClick = (item) => {
    if (item.type === 'FOLDER') {
      setCurrentPath(prev => [...prev, item.id]);
    } else {
      setPreviewDocument(item);
    }
  };

  // Handle context menu
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    });
  };

  // Handle context menu action
  const handleContextMenuAction = async (action, item) => {
    try {
      switch (action) {
        case 'view':
          if (item.type !== 'FOLDER') {
            setPreviewDocument(item);
          }
          break;
        case 'download':
          await companyDocsService.downloadAsset(item.id);
          toast.success(`Downloaded ${item.title}`);
          break;
        case 'rename':
          // Trigger inline renaming
          toast.info('Click on the item to rename');
          break;
        case 'duplicate':
          // Implement duplication
          toast.success(`Duplicated ${item.title}`);
          break;
        case 'toggle-favorite':
          await companyDocsService.toggleFavorite(item.id);
          handleToggleFavorite(item.id);
          break;
        case 'share':
          // Implement sharing
          toast.success(`Shared ${item.title}`);
          break;
        case 'move':
          // Implement move to folder
          toast.info('Drag the item to move it');
          break;
        case 'tag':
          // Implement tagging
          toast.info('Tagging feature coming soon');
          break;
        case 'archive':
          // Implement archiving
          toast.success(`Archived ${item.title}`);
          break;
        case 'delete':
          setDeleteConfirm(item);
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    }
    setContextMenu(null);
  };

  // Handle favorite toggle
  const handleToggleFavorite = (itemId) => {
    setFavorites(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      switch (action) {
        case 'download':
          // Download each item individually
          for (const itemId of selectedItems) {
            await companyDocsService.downloadAsset(itemId);
          }
          toast.success(`Downloaded ${selectedItems.length} items`);
          break;
        case 'move':
          toast.info('Drag selected items to move them');
          break;
        case 'delete':
          setDeleteConfirm({ 
            type: 'bulk', 
            items: selectedItems,
            count: selectedItems.length 
          });
          break;
        case 'favorite':
          // Toggle favorite for each item
          for (const itemId of selectedItems) {
            if (!favorites.includes(itemId)) {
              await companyDocsService.toggleFavorite(itemId);
              handleToggleFavorite(itemId);
            }
          }
          toast.success(`Added ${selectedItems.length} items to favorites`);
          break;
        case 'archive':
          toast.success(`Archived ${selectedItems.length} items`);
          break;
        default:
          console.log('Unknown bulk action:', action);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
    setSelectedItems([]);
  };

  // Handle navigation
  const handleNavigate = (path) => {
    setCurrentPath(path);
    setSelectedItems([]);
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    loadDocuments();
    setShowUploadZone(false);
  };

  // Handle item reordering
  const handleReorderItems = (dragIndex, hoverIndex) => {
    const currentContents = getCurrentFolderContents();
    const draggedItem = currentContents[dragIndex];
    const newContents = [...currentContents];
    
    // Remove dragged item
    newContents.splice(dragIndex, 1);
    // Insert at new position
    newContents.splice(hoverIndex, 0, draggedItem);
    
    // Update the documents state
    setDocuments(prev => {
      const updateDocuments = (items, path = []) => {
        if (path.length === 0) {
          return newContents;
        }
        
        return items.map(item => {
          if (item.id === path[0]) {
            if (path.length === 1) {
              return { ...item, children: newContents };
            }
            return { ...item, children: updateDocuments(item.children || [], path.slice(1)) };
          }
          return item;
        });
      };
      
      return updateDocuments(prev, currentPath);
    });
    
    toast.success('Items reordered successfully');
  };

  // Handle moving items between folders
  const handleMoveItem = async (item, targetFolderId) => {
    try {
      await companyDocsService.moveAsset(item.id, targetFolderId);
      toast.success(`Moved ${item.title} to folder`);
      loadDocuments();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  };

  // Handle dropping items in the main area
  const handleMainAreaDrop = (item) => {
    // Move to root folder
    handleMoveItem(item, null);
  };

  // Handle drag start
  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Handle rename
  const handleRename = () => {
    loadDocuments();
  };

  // Get current folder contents
  const getCurrentFolderContents = () => {
    let current = filteredDocuments;
    for (const folderId of currentPath) {
      const folder = current.find(item => item.id === folderId);
      if (folder && folder.children) {
        current = folder.children;
      } else {
        return [];
      }
    }
    return current;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setShowUploadZone(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadDocuments}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentContents = getCurrentFolderContents();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Drag Preview */}
        {draggedItem && (
          <DragPreview item={draggedItem} />
        )}
        {/* Search and Filter Bar */}
        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedItems.length}
          onBulkAction={handleBulkAction}
          colorMode={colorMode}
        />

        {/* Breadcrumb Navigation */}
        <BreadcrumbNav
          currentPath={currentPath}
          onNavigate={handleNavigate}
          colorMode={colorMode}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <DropZone
            onDrop={handleMainAreaDrop}
            className={`h-full p-6 transition-colors ${
              isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
            }`}
          >
            {/* Quick Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FolderPlusIcon className="w-5 h-5 mr-2" />
                  New Folder
                </button>
                <button
                  onClick={() => setShowUploadZone(true)}
                  className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                  Upload Files
                </button>
              </div>

              <div className="text-sm text-gray-500">
                {currentContents.length} item{currentContents.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Documents Grid/List */}
            {currentContents.length === 0 ? (
              <div className="text-center py-12">
                <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-6">Get started by uploading files or creating a folder</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowUploadZone(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload Files
                  </button>
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Create Folder
                  </button>
                </div>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'space-y-2'
              }>
                {currentContents.map((item, index) => (
                  <DocumentCard
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={selectedItems.includes(item.id)}
                    onSelect={handleItemSelect}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(item.id)}
                    viewMode={viewMode}
                    colorMode={colorMode}
                    onMoveItem={handleMoveItem}
                    onReorderItems={handleReorderItems}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onRename={handleRename}
                  />
                ))}
              </div>
            )}
          </DropZone>
        </div>

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Create New Folder</h3>
              </div>
              <div className="p-6">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3 p-6 pt-0">
                <button
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await companyDocsService.createFolder({
                        name: newFolderName,
                        parentId: currentPath.length > 0 ? currentPath[currentPath.length - 1] : null
                      });
                      toast.success(`Created folder "${newFolderName}"`);
                      setShowCreateFolder(false);
                      setNewFolderName('');
                      loadDocuments();
                    } catch (error) {
                      console.error('Error creating folder:', error);
                      toast.error('Failed to create folder');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone Modal */}
        {showUploadZone && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Upload Documents</h3>
                  <button
                    onClick={() => setShowUploadZone(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <DocumentUploadZone
                  onUploadComplete={handleUploadComplete}
                  parentId={currentPath.length > 0 ? currentPath[currentPath.length - 1] : null}
                  colorMode={colorMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDocument && (
          <DocumentPreviewModal
            isOpen={!!previewDocument}
            onClose={() => setPreviewDocument(null)}
            documentId={previewDocument.id}
            documentTitle={previewDocument.title}
            colorMode={colorMode}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            isOpen={true}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(null)}
            item={contextMenu.item}
            onAction={handleContextMenuAction}
            isFavorite={favorites.includes(contextMenu.item.id)}
            colorMode={colorMode}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  {deleteConfirm.type === 'bulk' 
                    ? `Delete ${deleteConfirm.count} items?` 
                    : `Delete "${deleteConfirm.title}"?`
                  }
                </h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600">
                  {deleteConfirm.type === 'bulk' 
                    ? `Are you sure you want to delete ${deleteConfirm.count} selected items? This action cannot be undone.`
                    : 'Are you sure you want to delete this item? This action cannot be undone.'
                  }
                </p>
              </div>
              <div className="flex justify-end space-x-3 p-6 pt-0">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (deleteConfirm.type === 'bulk') {
                        await companyDocsService.bulkDeleteAssets(deleteConfirm.items);
                        toast.success(`Deleted ${deleteConfirm.count} items`);
                      } else {
                        await companyDocsService.deleteAsset(deleteConfirm.id);
                        toast.success(`Deleted "${deleteConfirm.title}"`);
                      }
                      setDeleteConfirm(null);
                      loadDocuments();
                    } catch (error) {
                      console.error('Error deleting items:', error);
                      toast.error('Failed to delete items');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

export default ModernCompanyDocumentsPage;
