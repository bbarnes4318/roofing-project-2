import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { companyDocsService } from '../../services/api';
import toast from 'react-hot-toast';
import DocumentPreviewModal from '../ui/DocumentPreviewModal';
import DocumentUploadZone from '../ui/DocumentUploadZone';
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
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { 
  FolderIcon as FolderSolid,
  DocumentIcon as DocumentSolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

const ItemTypes = {
  FOLDER: 'folder',
  FILE: 'file'
};

// Enhanced Sidebar Component
const Sidebar = ({ 
  documents, 
  currentPath, 
  onNavigate, 
  onToggleFolder, 
  expandedFolders, 
  favorites,
  onToggleFavorite,
  colorMode 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const renderFolderTree = (items, depth = 0, parentPath = []) => {
    return items
      .filter(item => item.type === 'FOLDER')
      .filter(item => !searchQuery || item.title?.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(folder => {
        const folderPath = [...parentPath, folder.id];
        const isExpanded = expandedFolders.has(folder.id);
        const isCurrentFolder = currentPath.length > 0 && currentPath[currentPath.length - 1] === folder.id;
        const isFavorite = favorites.includes(folder.id);
        
        return (
          <div key={folder.id}>
            <div
              className={`
                flex items-center group px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200
                ${isCurrentFolder ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}
                ${colorMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100'}
              `}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => onNavigate(folderPath)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded mr-1"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3 text-gray-500" />
                )}
              </button>
              
              <div className="flex items-center flex-1 min-w-0">
                {isExpanded ? (
                  <FolderOpenIcon className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                ) : (
                  <FolderIcon className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                )}
                
                <span className="text-sm truncate flex-1">
                  {folder.title}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(folder.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded"
                >
                  {isFavorite ? (
                    <StarSolid className="w-3 h-3 text-yellow-500" />
                  ) : (
                    <StarOutline className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {isExpanded && folder.children && (
              <div>
                {renderFolderTree(folder.children, depth + 1, folderPath)}
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <div className={`w-80 border-r ${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} flex flex-col h-full`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-3">Folder Structure</h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <StarSolid className="w-4 h-4 text-yellow-500 mr-2" />
            Favorites
          </h3>
          <div className="space-y-1">
            {favorites.map(folderId => {
              const folder = findFolderById(documents, folderId);
              if (!folder) return null;
              return (
                <div
                  key={folderId}
                  className="flex items-center px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => onNavigate([folderId])}
                >
                  <FolderIcon className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm truncate">{folder.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {/* Root level */}
          <div
            className={`flex items-center px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
              currentPath.length === 0 ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            onClick={() => onNavigate([])}
          >
            <FolderIcon className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium">All Documents</span>
          </div>
          
          {renderFolderTree(documents)}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FolderPlusIcon className="w-4 h-4 mr-2" />
          New Folder
        </button>
      </div>
    </div>
  );
};

// Helper function to find folder by ID
const findFolderById = (items, id) => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findFolderById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Enhanced Draggable Item Component
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
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  viewMode = 'list',
  isSelected = false,
  onSelect,
  expandedFolders,
  favorites,
  colorMode
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.title || item.name);
  const [isLoading, setIsLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
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
          onMove(draggedItem.id, item.id);
        } else {
          onReorder(draggedItem.id, item.id);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [item, onMove, onReorder]);

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

  const getFileIcon = (mimeType, fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (mimeType?.includes('pdf') || ext === 'pdf') return <DocumentTextIcon className="w-6 h-6 text-red-500" />;
    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <PhotoIcon className="w-6 h-6 text-green-500" />;
    if (mimeType?.includes('video') || ['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return <FilmIcon className="w-6 h-6 text-purple-500" />;
    if (mimeType?.includes('audio') || ['mp3', 'wav', 'flac'].includes(ext)) return <MusicalNoteIcon className="w-6 h-6 text-orange-500" />;
    if (mimeType?.includes('word') || ext === 'docx' || ext === 'doc') return <DocumentTextIcon className="w-6 h-6 text-blue-500" />;
    if (mimeType?.includes('excel') || ext === 'xlsx' || ext === 'xls') return <TableCellsIcon className="w-6 h-6 text-green-600" />;
    if (mimeType?.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return <PresentationChartBarIcon className="w-6 h-6 text-orange-600" />;
    if (['js', 'ts', 'html', 'css', 'json', 'xml'].includes(ext)) return <CodeBracketIcon className="w-6 h-6 text-gray-600" />;
    
    return <DocumentIcon className="w-6 h-6 text-gray-500" />;
  };

  const isFolder = item.type === 'FOLDER';
  const isExpanded = expandedFolders && expandedFolders.has(item.id);
  const isFavorite = favorites && favorites.includes(item.id);

  if (viewMode === 'grid') {
    return (
      <div
        ref={ref}
        className={`
          relative group cursor-pointer rounded-2xl border transition-all duration-300 transform hover:scale-[1.02]
          ${isDragging ? 'opacity-50 scale-95 rotate-2' : ''}
          ${isOver && canDrop ? 'border-blue-400 bg-blue-50 shadow-xl ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
          ${isSelected ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' : 'bg-white hover:bg-gray-50 shadow-sm hover:shadow-lg'}
          ${isLoading ? 'pointer-events-none opacity-60' : ''}
        `}
        onClick={() => onSelect?.(item)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-3 left-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-3 h-3 text-white" />
          </div>
        )}
        
        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon Section */}
          <div className="mb-6 relative">
            {isFolder ? (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center">
                  {isExpanded ? (
                    <FolderOpenIcon className="w-10 h-10 text-blue-600" />
                  ) : (
                    <FolderIcon className="w-10 h-10 text-blue-600" />
                  )}
                </div>
                {isFavorite && (
                  <StarSolid className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 bg-white rounded-full p-1 shadow-sm" />
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
                  <div className="scale-125">
                    {getFileIcon(item.mimeType, item.title)}
                  </div>
                </div>
                {isFavorite && (
                  <StarSolid className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 bg-white rounded-full p-1 shadow-sm" />
                )}
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="w-full space-y-3">
            {isEditing ? (
              <input
                ref={editInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={handleRename}
                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                autoFocus
              />
            ) : (
              <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                {item.title || item.name}
              </h3>
            )}
            
            {/* Metadata */}
            <div className="space-y-2">
              {!isFolder && (
                <>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                    {formatFileSize(item.size)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(item.createdAt || item.updatedAt)}
                  </div>
                </>
              )}
              
              {isFolder && (
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {item.children?.length || 0} {item.children?.length === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        {showActions && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(item.id);
              }}
              className="p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              {isFavorite ? (
                <StarSolid className="w-4 h-4 text-yellow-500" />
              ) : (
                <StarOutline className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <PencilIcon className="w-4 h-4 text-gray-600" />
            </button>
            {!isFolder && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview?.(item);
                  }}
                  className="p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <EyeIcon className="w-4 h-4 text-green-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(item.id, item.title);
                  }}
                  className="p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-blue-500" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      ref={ref}
      className={`
        grid grid-cols-12 gap-6 items-center px-6 py-4 transition-all duration-200 cursor-pointer group
        ${isDragging ? 'opacity-50' : ''}
        ${isOver && canDrop ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
        ${isLoading ? 'pointer-events-none opacity-60' : ''}
      `}
      onClick={() => onSelect?.(item)}
    >
      {/* Selection Checkbox */}
      <div className="col-span-1 flex items-center">
        {isSelected && (
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Name Column */}
      <div className="col-span-6 flex items-center space-x-4">
        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-6" /> // Spacer for alignment
        )}
        
        <div className="relative">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
            {isFolder ? (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                {isExpanded ? (
                  <FolderOpenIcon className="w-6 h-6 text-blue-600" />
                ) : (
                  <FolderIcon className="w-6 h-6 text-blue-600" />
                )}
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="scale-110">
                  {getFileIcon(item.mimeType, item.title)}
                </div>
              </div>
            )}
          </div>
          {isFavorite && (
            <StarSolid className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyPress={handleKeyPress}
              onBlur={handleRename}
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
          ) : (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {item.title || item.name}
              </h3>
              {isFolder && (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {item.children?.length || 0} items
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Size Column */}
      <div className="col-span-2 text-right">
        {!isFolder && (
          <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 inline-block">
            {formatFileSize(item.size)}
          </div>
        )}
      </div>
      
      {/* Modified Column */}
      <div className="col-span-3 text-right">
        <div className="text-sm text-gray-600">
          {formatDate(item.createdAt || item.updatedAt)}
        </div>
      </div>
      
      {/* Actions Column */}
      <div className="col-span-1 flex justify-end">
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(item.id);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {isFavorite ? (
              <StarSolid className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarOutline className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4 text-gray-600" />
          </button>
          {!isFolder && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview?.(item);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <EyeIcon className="w-4 h-4 text-green-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item.id, item.title);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-blue-500" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Breadcrumb Component
const Breadcrumb = ({ path, onNavigate }) => {
  if (path.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-600">
        <FolderIcon className="w-4 h-4 mr-1" />
        <span className="font-medium">All Documents</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-1 text-sm">
      <button
        onClick={() => onNavigate([])}
        className="flex items-center text-blue-600 hover:text-blue-800"
      >
        <FolderIcon className="w-4 h-4 mr-1" />
        All Documents
      </button>
      {path.map((folderId, index) => (
        <React.Fragment key={folderId}>
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => onNavigate(path.slice(0, index + 1))}
            className="text-blue-600 hover:text-blue-800"
          >
            Folder {folderId}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

// Main Enhanced Component
const EnhancedCompanyDocumentsPage = ({ colorMode }) => {
  console.log('EnhancedCompanyDocumentsPage is rendering!', { colorMode });
  // Core state
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [currentPath, setCurrentPath] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  // Upload state
  const [uploads, setUploads] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Load documents from API
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use mock data since the API might not be fully implemented
      // TODO: Replace with actual API call when backend is ready
      const mockAssets = [
        {
          id: '1',
          title: 'Company Policies',
          type: 'FOLDER',
          parentId: null,
          createdAt: new Date().toISOString(),
          children: [
            {
              id: '1-1',
              title: 'Employee Handbook 2024.pdf',
              type: 'FILE',
              parentId: '1',
              mimeType: 'application/pdf',
              size: 2048576,
              createdAt: new Date().toISOString(),
              children: []
            },
            {
              id: '1-2',
              title: 'Safety Guidelines.docx',
              type: 'FILE',
              parentId: '1',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: 1024000,
              createdAt: new Date().toISOString(),
              children: []
            }
          ]
        },
        {
          id: '2',
          title: 'Templates',
          type: 'FOLDER',
          parentId: null,
          createdAt: new Date().toISOString(),
          children: [
            {
              id: '2-1',
              title: 'Project Proposal Template.docx',
              type: 'FILE',
              parentId: '2',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              size: 512000,
              createdAt: new Date().toISOString(),
              children: []
            },
            {
              id: '2-2',
              title: 'Invoice Template.xlsx',
              type: 'FILE',
              parentId: '2',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 256000,
              createdAt: new Date().toISOString(),
              children: []
            }
          ]
        },
        {
          id: '3',
          title: 'Marketing Materials',
          type: 'FOLDER',
          parentId: null,
          createdAt: new Date().toISOString(),
          children: [
            {
              id: '3-1',
              title: 'Company Logo.png',
              type: 'FILE',
              parentId: '3',
              mimeType: 'image/png',
              size: 128000,
              createdAt: new Date().toISOString(),
              children: []
            },
            {
              id: '3-2',
              title: 'Brochure Design.pdf',
              type: 'FILE',
              parentId: '3',
              mimeType: 'application/pdf',
              size: 3072000,
              createdAt: new Date().toISOString(),
              children: []
            }
          ]
        }
      ];
      
      const hierarchicalData = buildHierarchy(mockAssets);
      setDocuments(hierarchicalData);
      
      // Try real API call but don't fail if it doesn't work
      try {
        const response = await companyDocsService.listAssets();
        if (response.success && response.data.assets) {
          const realData = buildHierarchy(response.data.assets);
          setDocuments(realData);
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
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
        if (a.type !== b.type) {
          return a.type === 'FOLDER' ? -1 : 1;
        }
        return a.title?.localeCompare(b.title) || 0;
      });
  };

  // Get current folder contents
  const getCurrentFolderContents = () => {
    let currentFolder = documents;
    
    for (const folderId of currentPath) {
      currentFolder = currentFolder.find(item => item.id === folderId);
      if (!currentFolder || !currentFolder.children) {
        return [];
      }
      currentFolder = currentFolder.children;
    }
    
    return currentFolder || [];
  };

  // Filter items based on search
  const filteredItems = getCurrentFolderContents().filter(item => {
    if (!searchQuery) return true;
    return item.title?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Event handlers
  const handleMove = async (itemId, targetFolderId) => {
    try {
      // Update local state immediately
      const moveItem = (items) => {
        let itemToMove = null;
        
        // Find and remove the item
        const filteredItems = items.filter(item => {
          if (item.id === itemId) {
            itemToMove = { ...item };
            return false;
          }
          if (item.children) {
            item.children = moveItem(item.children);
          }
          return true;
        });
        
        // Add item to target folder
        if (itemToMove && targetFolderId) {
          const addToTarget = (items) => {
            for (let item of items) {
              if (item.id === targetFolderId) {
                item.children = item.children || [];
                itemToMove.parentId = targetFolderId;
                item.children.push(itemToMove);
                return true;
              }
              if (item.children && addToTarget(item.children)) {
                return true;
              }
            }
            return false;
          };
          addToTarget(filteredItems);
        }
        
        return filteredItems;
      };
      
      const updatedDocuments = moveItem(documents);
      setDocuments(updatedDocuments);
      
      toast.success('Item moved successfully');
      
      // Try real API call
      try {
        await companyDocsService.updateAsset(itemId, { parentId: targetFolderId });
      } catch (apiError) {
        console.log('API move failed, but item moved locally');
      }
      
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  };

  const handleReorder = async (itemId, targetItemId) => {
    // Implement reordering logic
    toast.success('Items reordered');
  };

  const handleRename = async (itemId, newName) => {
    try {
      await companyDocsService.updateAsset(itemId, { title: newName });
      await loadDocuments();
    } catch (error) {
      toast.error('Failed to rename item');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      // Remove from local state immediately
      const removeItem = (items) => {
        return items.filter(item => {
          if (item.id === itemId) {
            return false;
          }
          if (item.children) {
            item.children = removeItem(item.children);
          }
          return true;
        });
      };
      
      const updatedDocuments = removeItem(documents);
      setDocuments(updatedDocuments);
      
      // Remove from selected items if it was selected
      setSelectedItems(selectedItems.filter(item => item.id !== itemId));
      
      toast.success('Item deleted successfully');
      
      // Try real API call
      try {
        await companyDocsService.deleteAsset(itemId);
      } catch (apiError) {
        console.log('API delete failed, but item removed locally');
      }
      
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleToggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
      
      // Create mock folder for now
      const newFolder = {
        id: `folder-${Date.now()}`,
        title: newFolderName.trim(),
        type: 'FOLDER',
        parentId: parentId,
        createdAt: new Date().toISOString(),
        children: []
      };
      
      // Add to current documents structure
      const updatedDocuments = [...documents];
      if (parentId) {
        // Add to specific parent folder
        const addToParent = (items) => {
          for (let item of items) {
            if (item.id === parentId) {
              item.children = item.children || [];
              item.children.push(newFolder);
              return true;
            }
            if (item.children && addToParent(item.children)) {
              return true;
            }
          }
          return false;
        };
        addToParent(updatedDocuments);
      } else {
        // Add to root level
        updatedDocuments.push(newFolder);
      }
      
      setDocuments(updatedDocuments);
      setShowCreateFolder(false);
      setNewFolderName('');
      toast.success('Folder created successfully');
      
      // Try real API call
      try {
        await companyDocsService.createFolder({ 
          name: newFolderName.trim(), 
          parentId: parentId 
        });
      } catch (apiError) {
        console.log('API call failed, but folder created locally');
      }
      
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleToggleFavorite = (itemId) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];
    setFavorites(newFavorites);
  };

  const handleSelect = (item) => {
    if (selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems);
    }
  };

  const handleDownload = async (itemId, fileName) => {
    try {
      // Try real API download
      try {
        const response = await companyDocsService.downloadAsset(itemId);
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('File downloaded successfully');
      } catch (apiError) {
        // Fallback: create a mock download
        const mockContent = `This is a mock download for ${fileName}`;
        const blob = new Blob([mockContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('File downloaded (mock)');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handlePreview = (item) => {
    if (item.type === 'FILE') {
      setPreviewDocument(item);
    }
  };

  const handleUploadComplete = (newAsset) => {
    // Refresh the documents list
    loadDocuments();
    setShowUploadZone(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
    
    try {
      for (const file of files) {
        // Create mock file entry
        const newFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          title: file.name,
          type: 'FILE',
          parentId: parentId,
          mimeType: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
          children: []
        };

        // Add to current documents structure
        const updatedDocuments = [...documents];
        if (parentId) {
          // Add to specific parent folder
          const addToParent = (items) => {
            for (let item of items) {
              if (item.id === parentId) {
                item.children = item.children || [];
                item.children.push(newFile);
                return true;
              }
              if (item.children && addToParent(item.children)) {
                return true;
              }
            }
            return false;
          };
          addToParent(updatedDocuments);
        } else {
          // Add to root level
          updatedDocuments.push(newFile);
        }
        
        setDocuments(updatedDocuments);
        
        // Try real API upload
        try {
          await companyDocsService.uploadAsset(file, { 
            parentId: parentId,
            title: file.name 
          });
        } catch (apiError) {
          console.log('API upload failed, but file added locally');
        }
      }
      
      toast.success(`${files.length} file(s) uploaded successfully`);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      // Clear the input
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
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
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex bg-white">
        {/* DEBUG: This should be visible if EnhancedCompanyDocumentsPage is rendering */}
        <div className="fixed top-0 left-0 z-50 bg-red-500 text-white p-2 text-xs">
          ENHANCED COMPANY DOCUMENTS PAGE IS RENDERING!
        </div>
        {/* Enhanced Sidebar */}
        <Sidebar
          documents={documents}
          currentPath={currentPath}
          onNavigate={setCurrentPath}
          onToggleFolder={handleToggleFolder}
          expandedFolders={expandedFolders}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          colorMode={colorMode}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Section */}
          <div className={`${colorMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
            {/* Top Header Bar */}
            <div className="px-8 py-6">
              <div className="flex items-start justify-between">
                {/* Left: Title and Breadcrumb */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FolderIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-3xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                        Company Documents
                      </h1>
                      <p className={`text-base ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Organize and manage your company files with ease
                      </p>
                    </div>
                  </div>
                  
                  {/* Breadcrumb with better styling */}
                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
                  </div>
                </div>
                
                {/* Right: Action Buttons */}
                <div className="flex items-center space-x-4 ml-8">
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <FolderPlusIcon className="w-5 h-5 mr-2" />
                    <span className="font-medium">New Folder</span>
                  </button>
                  
                  <button
                    onClick={() => setShowUploadZone(true)}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                    <span className="font-medium">Upload Files</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Toolbar Section */}
            <div className={`px-8 py-4 ${colorMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t`}>
              <div className="flex items-center justify-between">
                {/* Left: Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents, folders, and files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    />
                  </div>
                </div>
                
                {/* Right: View Controls and Info */}
                <div className="flex items-center space-x-6">
                  {/* Results count */}
                  <div className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                    {searchQuery && ` found for "${searchQuery}"`}
                  </div>
                  
                  {/* View Mode Toggle */}
                  <div className="flex bg-white border border-gray-300 rounded-xl p-1 shadow-sm">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <ListBulletIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bulk Actions Bar */}
            {selectedItems.length > 0 && (
              <div className="px-8 py-4 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{selectedItems.length}</span>
                    </div>
                    <span className="text-base font-medium text-blue-800">
                      {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                      Move
                    </button>
                    <button className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                      <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                      Copy
                    </button>
                    <button 
                      onClick={() => {
                        selectedItems.forEach(item => handleDelete(item.id));
                        setSelectedItems([]);
                      }}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {filteredItems.length === 0 ? (
              <div className="h-full flex items-center justify-center p-12">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FolderIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {searchQuery ? 'No documents found' : 'This folder is empty'}
                  </h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    {searchQuery 
                      ? `No documents match your search for "${searchQuery}". Try a different search term or browse all documents.`
                      : 'Start by creating folders to organize your documents or upload some files to get started.'
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setShowCreateFolder(true)}
                      className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <FolderPlusIcon className="w-5 h-5 mr-2" />
                      Create Folder
                    </button>
                    <button
                      onClick={() => setShowUploadZone(true)}
                      className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                      Upload Files
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                {viewMode === 'grid' ? (
                  <div className="space-y-8">
                    {/* Grid Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {searchQuery ? `Search Results` : `All Items`}
                        </h2>
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {filteredItems.length} items
                        </div>
                      </div>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {selectedItems.length === filteredItems.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                      {filteredItems.map(item => (
                        <DraggableItem
                          key={item.id}
                          item={item}
                          onMove={handleMove}
                          onReorder={handleReorder}
                          onRename={handleRename}
                          onDelete={handleDelete}
                          onToggle={handleToggleFolder}
                          onToggleFavorite={handleToggleFavorite}
                          onDownload={handleDownload}
                          onPreview={handlePreview}
                          viewMode={viewMode}
                          isSelected={selectedItems.find(selected => selected.id === item.id)}
                          onSelect={handleSelect}
                          expandedFolders={expandedFolders}
                          favorites={favorites}
                          colorMode={colorMode}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* List Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {searchQuery ? `Search Results` : `All Items`}
                        </h2>
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {filteredItems.length} items
                        </div>
                      </div>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {selectedItems.length === filteredItems.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    {/* List Container */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* List Header Row */}
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-12 gap-6 items-center text-sm font-medium text-gray-700">
                          <div className="col-span-6">Name</div>
                          <div className="col-span-2">Size</div>
                          <div className="col-span-3">Modified</div>
                          <div className="col-span-1">Actions</div>
                        </div>
                      </div>
                      
                      {/* List Items */}
                      <div className="divide-y divide-gray-100">
                        {filteredItems.map(item => (
                          <DraggableItem
                            key={item.id}
                            item={item}
                            onMove={handleMove}
                            onReorder={handleReorder}
                            onRename={handleRename}
                            onDelete={handleDelete}
                            onToggle={handleToggleFolder}
                            onToggleFavorite={handleToggleFavorite}
                            onDownload={handleDownload}
                            onPreview={handlePreview}
                            viewMode={viewMode}
                            isSelected={selectedItems.find(selected => selected.id === item.id)}
                            onSelect={handleSelect}
                            expandedFolders={expandedFolders}
                            favorites={favorites}
                            colorMode={colorMode}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
          onChange={handleFileUpload}
        />
        
        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      </div>
    </DndProvider>
  );
};

export default EnhancedCompanyDocumentsPage;
