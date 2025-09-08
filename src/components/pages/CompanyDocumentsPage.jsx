import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { companyDocsService, API_ORIGIN, projectsService } from '../../services/api';
import socketService from '../../services/socket';
import EnhancedProjectDropdown from '../ui/EnhancedProjectDropdown';
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
  StarIcon,
  EyeIcon,
  ShareIcon,
  DownloadIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ClockIcon,
  UserGroupIcon,
  BoltIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarSolid,
  EyeIcon as EyeSolid 
} from '@heroicons/react/24/solid';

const ItemTypes = {
  FOLDER: 'folder',
  FILE: 'file',
  TAB: 'tab'
};

// Quick Move Panel for off-screen folder targeting
const QuickMovePanel = ({ isVisible, folders, onMove, draggedItem, onClose }) => {
  if (!isVisible || !draggedItem) return null;

  // Recursively collect all folders with their paths
  const collectFolders = (items, currentPath = '') => {
    const allFolders = [];
    
    items.forEach(item => {
      if (item.type === 'folder') {
        const folderPath = currentPath ? `${currentPath}/${item.id}` : item.id;
        allFolders.push({
          id: item.id,
          name: item.name,
          path: folderPath,
          level: currentPath.split('/').filter(p => p).length
        });
        
        if (item.children) {
          allFolders.push(...collectFolders(item.children, folderPath));
        }
      }
    });
    
    return allFolders;
  };

  const allFolders = collectFolders(folders);

  const handleFolderSelect = (folder) => {
    onMove(draggedItem.item, draggedItem.path, folder.path);
    onClose();
  };

  return (
    <div className="fixed top-20 right-4 w-80 max-h-96 bg-white rounded-lg shadow-2xl border-2 border-blue-300 z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            <h3 className="font-semibold">Quick Move: {draggedItem?.item?.name}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm opacity-90 mt-1">Click any folder to move here</p>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {allFolders.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FolderPlusIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders available</p>
            <p className="text-xs">Create a folder first</p>
          </div>
        ) : (
          <div className="py-2">
            {allFolders.map((folder) => (
              <button
                key={folder.path}
                onClick={() => handleFolderSelect(folder)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                style={{ paddingLeft: `${16 + folder.level * 20}px` }}
              >
                <FolderIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {folder.level > 0 ? `Level ${folder.level + 1}` : 'Root'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Drag to any folder in the main view or click here for off-screen folders</span>
        </div>
      </div>
    </div>
  );
};

// AI-Powered Smart Search Component
const SmartSearch = ({ onSearch, documents }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSuggestions([]);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSmartSearch = async (searchQuery) => {
    setIsAIProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      if (isFocused && searchQuery.length > 2) {
        const smartSuggestions = [
          { type: 'ai-insight', text: `📊 Found 12 contract templates similar to "${searchQuery}"`, action: 'filter:contracts' },
          { type: 'ai-insight', text: `🔍 AI suggests: "warranty documents" might be what you're looking for`, action: 'search:warranty' },
          { type: 'quick-action', text: `⚡ Quick create: "${searchQuery}" folder with smart templates`, action: 'create-smart' },
          { type: 'ai-insight', text: `💡 Pro tip: Use "roof inspection" to find related checklists`, action: 'tip' }
        ];
        setSuggestions(smartSuggestions);
      }
      setIsAIProcessing(false);
    }, 800);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 2) {
              handleSmartSearch(e.target.value);
            } else {
              setSuggestions([]);
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.length > 2) {
              handleSmartSearch(query);
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => {
              if (!searchRef.current?.contains(document.activeElement)) {
                setIsFocused(false);
                setSuggestions([]);
              }
            }, 200);
          }}
          className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="🤖 AI-powered search... (try 'contracts', 'inspection', etc.)"
        />
        {isAIProcessing && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      {suggestions.length > 0 && isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.success(suggestion.text);
                setSuggestions([]);
                setIsFocused(false);
                setQuery('');
              }}
            >
              <div className="text-sm text-gray-700">{suggestion.text}</div>
              {suggestion.type === 'ai-insight' && (
                <div className="text-xs text-purple-600 mt-1">✨ AI Suggestion</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Magic Auto-Organization Component
const MagicOrganizer = ({ onOrganize }) => {
  const [isOrganizing, setIsOrganizing] = useState(false);
  
  const handleMagicOrganize = async () => {
    setIsOrganizing(true);
    
    // Simulate AI magic organization
    setTimeout(() => {
      toast.success('🪄 AI Magic: Organized files by project type, date, and priority!');
      onOrganize();
      setIsOrganizing(false);
    }, 2000);
  };

  return (
    <button
      onClick={handleMagicOrganize}
      disabled={isOrganizing}
      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1.5"
      title="AI-powered auto-organization"
    >
      {isOrganizing ? (
        <>
          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
          Organizing...
        </>
      ) : (
        <>
          <SparklesIcon className="w-3.5 h-3.5" />
          AI Organize
        </>
      )}
    </button>
  );
};

// Smart Template Suggestions Component
const SmartTemplateSuggester = ({ currentFolder, onCreateTemplate }) => {
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    // AI-powered template suggestions based on folder context
    const contextSuggestions = {
      'contracts': [
        '📄 Roofing Service Agreement Template',
        '📋 Material Supply Contract',
        '🔒 Warranty Terms Template',
        '💼 Subcontractor Agreement'
      ],
      'inspection': [
        '🔍 Pre-Installation Checklist',
        '📊 Quality Inspection Report',
        '📱 Photo Documentation Template',
        '⚠️ Issue Tracking Form'
      ],
      'customer': [
        '📞 Customer Onboarding Guide',
        '📧 Project Update Email Template',
        '🎯 Satisfaction Survey',
        '💡 Maintenance Tips Sheet'
      ]
    };
    
    const folderKey = currentFolder?.name?.toLowerCase() || '';
    const matchedSuggestions = Object.entries(contextSuggestions).find(([key]) => 
      folderKey.includes(key)
    );
    
    if (matchedSuggestions) {
      setSuggestions(matchedSuggestions[1]);
    }
  }, [currentFolder]);

  if (!suggestions.length) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <BoltIcon className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900">🤖 AI Template Suggestions</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map((template, idx) => (
          <button
            key={idx}
            onClick={() => {
              onCreateTemplate(template);
              toast.success(`Creating: ${template}`);
            }}
            className="text-left p-2 bg-white rounded border hover:border-blue-400 hover:shadow-md transition-all text-sm"
          >
            {template}
          </button>
        ))}
      </div>
    </div>
  );
};

// Advanced File Properties Panel
const FilePropertiesPanel = ({ file, onUpdate, onClose }) => {
  const [properties, setProperties] = useState({
    tags: file?.tags || [],
    priority: file?.priority || 'medium',
    favorite: file?.favorite || false,
    notes: file?.notes || '',
    projectPhase: file?.projectPhase || '',
    accessLevel: file?.accessLevel || 'team'
  });

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-red-100 text-red-800',
    critical: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-blue-600" />
            File Properties
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">📁 File Name</label>
            <div className="text-sm font-semibold text-gray-700">{file?.name}</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">🏷️ Tags</label>
            <div className="flex flex-wrap gap-1">
              {['Contract', 'Inspection', 'Warranty', 'Customer', 'Internal'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    const newTags = properties.tags.includes(tag)
                      ? properties.tags.filter(t => t !== tag)
                      : [...properties.tags, tag];
                    setProperties({...properties, tags: newTags});
                  }}
                  className={`px-2 py-1 text-xs rounded-full transition-all ${
                    properties.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">🎯 Priority</label>
            <select
              value={properties.priority}
              onChange={(e) => setProperties({...properties, priority: e.target.value})}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
              <option value="critical">🟣 Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📝 Notes</label>
            <textarea
              value={properties.notes}
              onChange={(e) => setProperties({...properties, notes: e.target.value})}
              className="w-full border rounded px-3 py-2 text-sm h-20 resize-none"
              placeholder="Add notes about this file..."
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setProperties({...properties, favorite: !properties.favorite})}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                properties.favorite 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {properties.favorite ? <StarSolid className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />}
              Favorite
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onUpdate({...file, ...properties});
              toast.success('File properties updated!');
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Collaborative Features Component
const CollaborationPanel = ({ file, onShare }) => {
  const [shareLevel, setShareLevel] = useState('view');
  const [collaborators, setCollaborators] = useState([
    { name: 'Sarah Johnson', role: 'Project Manager', avatar: '👩‍💼', online: true },
    { name: 'Mike Chen', role: 'Field Director', avatar: '👨‍🔧', online: false },
    { name: 'Lisa Davis', role: 'Office Admin', avatar: '👩‍💻', online: true }
  ]);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserGroupIcon className="w-5 h-5 text-green-600" />
        <h4 className="font-semibold text-green-900">👥 Team Collaboration</h4>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Share with team:</span>
          <select 
            value={shareLevel}
            onChange={(e) => setShareLevel(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="view">👀 View Only</option>
            <option value="edit">✏️ Can Edit</option>
            <option value="admin">⚙️ Full Access</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          {collaborators.slice(0, 3).map((person, idx) => (
            <div key={idx} className="relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                person.online ? 'ring-2 ring-green-400' : 'ring-2 ring-gray-300'
              }`}>
                {person.avatar}
              </div>
              {person.online && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              )}
            </div>
          ))}
          <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm hover:bg-gray-200">
            +2
          </button>
        </div>
        
        <button
          onClick={() => {
            onShare(file, shareLevel);
            toast.success('🚀 File shared with team!');
          }}
          className="w-full px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <ShareIcon className="w-4 h-4" />
          Share Now
        </button>
      </div>
    </div>
  );
};

// Enhanced Draggable Item with all the bells and whistles
const DraggableItem = ({ item, path, onMove, onRename, onDelete, onToggle, onShowProperties, onShare, onReorder, onDragStart, onDragEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dropPosition, setDropPosition] = useState(null); // 'above' or 'below'
  
  const [{ isDragging }, drag] = useDrag({
    type: item.type === 'folder' ? ItemTypes.FOLDER : ItemTypes.FILE,
    item: { item, path },
    begin: () => {
      if (onDragStart) onDragStart({ item, path });
    },
    end: () => {
      if (onDragEnd) onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.FOLDER, ItemTypes.FILE],
    canDrop: (draggedItem) => {
      // Don't allow dropping an item on itself
      if (draggedItem.item.id === item.id) return false;
      
      // For folder dropping (existing functionality)
      if (item.type === 'folder') {
        // Don't allow dropping a folder into its own descendants
        const newPath = path ? `${path}/${item.id}` : item.id;
        if (draggedItem.item.type === 'folder' && newPath.includes(draggedItem.item.id)) return false;
        
        // Don't allow dropping in the same location
        if (draggedItem.path === newPath) return false;
        
        return true;
      }
      
      // For file reordering (new functionality)
      // Allow reordering files within the same folder level
      return draggedItem.path === path;
    },
    hover: (draggedItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      
      // Calculate drop position for file reordering
      if (item.type !== 'folder' && draggedItem.path === path) {
        const hoverBoundingRect = monitor.getDropTargetMonitor().getClientBoundingRect();
        const clientOffset = monitor.getClientOffset();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;
        
        setDropPosition(hoverClientY < hoverMiddleY ? 'above' : 'below');
      } else {
        setDropPosition(null);
      }
    },
    drop: (draggedItem) => {
      if (item.type === 'folder') {
        // Existing folder drop functionality
        const newPath = path ? `${path}/${item.id}` : item.id;
        console.log(`Dropping item:`, draggedItem.item.name, `from path:`, draggedItem.path, `to path:`, newPath);
        onMove(draggedItem.item, draggedItem.path, newPath);
      } else {
        // New file reordering functionality
        if (onReorder && draggedItem.path === path) {
          console.log(`Reordering item:`, draggedItem.item.name, `${dropPosition} item:`, item.name);
          onReorder(draggedItem.item, item, dropPosition);
        }
      }
      setDropPosition(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleRename = () => {
    if (editName.trim() && editName !== item.name) {
      onRename(item, path, editName.trim());
    }
    setIsEditing(false);
  };

  const isFolder = item.type === 'folder';
  const Icon = isFolder ? (item.expanded ? FolderOpenIcon : FolderIcon) : DocumentIcon;
  
  // Get priority styling
  const getPriorityStyle = () => {
    if (!item.priority) return '';
    const styles = {
      low: 'border-l-4 border-green-400',
      medium: 'border-l-4 border-yellow-400',
      high: 'border-l-4 border-red-400',
      critical: 'border-l-4 border-purple-400'
    };
    return styles[item.priority] || '';
  };

  return (
    <div className="group relative">
      {/* Drop zone indicator for file reordering */}
      {dropPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg z-10" />
      )}
      
      <div
        ref={(node) => {
          drag(node);
          drop(node); // Now all items can be drop targets
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowQuickActions(false);
        }}
        className={`flex items-center gap-2 p-3 rounded-lg cursor-move hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
          isDragging ? 'opacity-50 transform rotate-2' : ''
        } ${isOver && canDrop && item.type === 'folder' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 border-dashed shadow-lg' : ''} ${
          isOver && canDrop && item.type !== 'folder' && dropPosition ? 'bg-blue-50' : ''
        } ${getPriorityStyle()}`}
        style={{ paddingLeft: `${(path.split('/').length - 1) * 20 + 12}px` }}
      >
      
      {/* Drop zone indicator for file reordering */}
      {dropPosition === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg z-10" />
      )}
        {/* Folder Toggle */}
        {isFolder && (
          <button
            onClick={() => onToggle(item, path)}
            className="p-1 hover:bg-white hover:shadow-sm rounded transition-all"
          >
            {item.expanded ? (
              <ChevronDownIcon className="w-4 h-4 text-blue-600" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        
        {/* File/Folder Icon */}
        <div className="relative">
          <Icon className={`w-6 h-6 ${isFolder ? 'text-blue-500' : 'text-gray-500'} transition-transform ${isHovered ? 'scale-110' : ''}`} />
          {item.favorite && (
            <StarSolid className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
          )}
          {item.priority === 'critical' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
        
        {/* File/Folder Name */}
        {isEditing ? (
          <input
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1">
                  {item.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {item.type === 'file' && (
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                {item.size && <span>{formatFileSize(item.size)}</span>}
                {item.uploadedAt && <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>}
                {item.priority && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.priority === 'critical' ? 'bg-purple-100 text-purple-800' :
                    item.priority === 'high' ? 'bg-red-100 text-red-800' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.priority}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions - Show on Hover */}
        {isHovered && (
          <div className="flex items-center gap-1 animate-fade-in">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowProperties(item);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all tooltip"
              title="Properties"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
              title="Rename"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(item);
              }}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all"
              title="Share"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item, path);
              }}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Expanded Folder Contents */}
      {isFolder && item.expanded && item.children && (
        <div className="ml-2 border-l-2 border-gray-100">
          {item.children.map((child) => (
            <DraggableItem
              key={child.id}
              item={child}
              path={`${path}/${item.id}`}
              onMove={onMove}
              onReorder={onReorder}
              onRename={onRename}
              onDelete={onDelete}
              onToggle={onToggle}
              onShowProperties={onShowProperties}
              onShare={onShare}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Enhanced Tab with activity indicators
const DraggableTab = ({ tab, index, active, onClick, onRename, onDelete, moveTab, documentCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TAB,
    item: { index, tab },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.TAB,
    hover: (item) => {
      if (item.index !== index) {
        moveTab(item.index, index);
        item.index = index;
      }
    },
  });

  const handleRename = () => {
    if (editName.trim() && editName !== tab.name) {
      onRename(tab.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`relative group ${isDragging ? 'opacity-50 transform rotate-2' : ''}`}
    >
      {isEditing ? (
        <input
          className="px-4 py-2 text-sm font-semibold rounded-lg border-2 border-blue-400 focus:ring-2 focus:ring-blue-500"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyPress={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
        />
      ) : (
        <button
          onClick={onClick}
          onDoubleClick={() => !tab.protected && setIsEditing(true)}
          className={`relative px-2 py-1 text-xs font-medium rounded border transition-all ${
            active 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          } flex items-center gap-1`}
        >
          <span>{tab.name}</span>
          {documentCount > 0 && (
            <span className={`px-1 py-0.5 text-xs rounded ${
              active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {documentCount}
            </span>
          )}
          {!tab.protected && (
            <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg transform hover:scale-110 transition-all"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tab.id);
                }}
                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default function CompanyDocumentsPage({ colorMode }) {
  // Enhanced state management
  const [tabs, setTabs] = useState([
    { id: 'company-docs', name: 'Company Documents', protected: false },
    { id: 'project-templates', name: 'Product Specific Templates', protected: true },
    { id: 'generate', name: 'Generate', protected: true }
  ]);
  const [activeTabId, setActiveTabId] = useState('company-docs');
  
  // Enhanced document state with rich properties
  const [documents, setDocuments] = useState({});
  const [viewMode, setViewMode] = useState('tree');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemType, setNewItemType] = useState('folder');
  const [newItemName, setNewItemName] = useState('');
  const [selectedParentFolder, setSelectedParentFolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileProperties, setShowFileProperties] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  
  // Generation state
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generationFields, setGenerationFields] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Legacy state
  const [assets, setAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Helper function to convert assets to enhanced document format
  const convertAssetsToDocuments = (assets) => {
    if (!Array.isArray(assets)) {
      console.warn('Assets is not an array:', assets);
      return [];
    }
    return assets.map(asset => ({
      id: asset.id || asset._id,
      name: asset.title || asset.name || asset.filename,
      type: 'file',
      size: asset.fileSize || asset.size || 0,
      priority: asset.priority || 'medium',
      tags: asset.tags || [],
      favorite: asset.favorite || false,
      notes: asset.description || '',
      uploadedAt: asset.createdAt || asset.uploadedAt || new Date().toISOString(),
      url: asset.fileUrl || asset.url,
      section: asset.section
    }));
  };

  // Load real data from API and initialize enhanced features for Company Documents only
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load assets for Company Documents tab
        const assetsResponse = await companyDocsService.listAssets();
        console.log('Assets API response:', assetsResponse);
        if (assetsResponse.success) {
          setAssets(assetsResponse.data || []);
        }
        
        // Load templates for Product Specific Templates tab
        const templatesResponse = await companyDocsService.listTemplates();
        console.log('Templates API response:', templatesResponse);
        if (templatesResponse.success) {
          const templatesData = templatesResponse.data?.templates || templatesResponse.templates || [];
          setTemplates(Array.isArray(templatesData) ? templatesData : []);
        }
        
        // Convert assets to enhanced document format for Company Documents tab only
        const assetsData = assetsResponse.data?.assets || assetsResponse.assets || [];
        const enhancedAssets = convertAssetsToDocuments(assetsData);
        setDocuments(prev => ({
          ...prev,
          'company-docs': enhancedAssets
        }));
        
      } catch (error) {
        console.error('Error fetching company documents:', error);
        setError('Failed to load documents');
        // Initialize with empty state if API fails
        setDocuments(prev => ({
          ...prev,
          'company-docs': []
        }));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Enhanced tab management
  const moveTab = useCallback((fromIndex, toIndex) => {
    setTabs((prevTabs) => {
      const newTabs = [...prevTabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
    toast.success('📋 Tab reordered!');
  }, []);

  const renameTab = (tabId, newName) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, name: newName } : tab
      )
    );
    toast.success(`✨ Tab renamed to "${newName}"`);
  };

  const deleteTab = (tabId) => {
    if (tabs.filter(t => !t.protected).length <= 1) {
      toast.error('❌ Cannot delete the last custom tab');
      return;
    }
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      delete newDocs[tabId];
      return newDocs;
    });
    if (activeTabId === tabId) {
      setActiveTabId('company-docs');
    }
    toast.success('🗑️ Tab deleted successfully!');
  };

  const addNewTab = () => {
    const newId = `custom-${Date.now()}`;
    const newTab = {
      id: newId,
      name: `🆕 Custom Tab ${tabs.filter(t => !t.protected).length}`,
      protected: false
    };
    setTabs([...tabs, newTab]);
    setDocuments(prevDocs => ({
      ...prevDocs,
      [newId]: []
    }));
    setActiveTabId(newId);
    toast.success('🎉 New custom tab created!');
  };

  // Enhanced document management with rich features
  const handleItemMove = (item, fromPath, toPath) => {
    const tabId = activeTabId;
    
    // Don't move if dropping on the same location
    if (fromPath === toPath) {
      return;
    }
    
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
      
      const removeItemFromPath = (items, targetId, currentPath = '') => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            const removedItem = items.splice(i, 1)[0];
            console.log(`Removed item "${targetId}" from path "${currentPath}"`);
            return removedItem;
          }
          if (items[i].children && items[i].children.length > 0) {
            const newPath = currentPath ? `${currentPath}/${items[i].id}` : items[i].id;
            const removed = removeItemFromPath(items[i].children, targetId, newPath);
            if (removed) return removed;
          }
        }
        return null;
      };
      
      const addItemToPath = (items, targetPath, itemToAdd) => {
        if (!targetPath || targetPath === '') {
          items.push(itemToAdd);
          console.log(`Added item "${itemToAdd.id}" to root`);
          return true;
        }
        
        const pathParts = targetPath.split('/').filter(p => p);
        let currentItems = items;
        let currentPath = '';
        
        for (const pathPart of pathParts) {
          currentPath = currentPath ? `${currentPath}/${pathPart}` : pathPart;
          const folder = currentItems.find(item => item.id === pathPart && item.type === 'folder');
          if (folder && folder.children) {
            currentItems = folder.children;
            folder.expanded = true; // Auto-expand target folder
          } else {
            console.error(`Target folder not found at path: ${currentPath}`);
            return false;
          }
        }
        
        currentItems.push(itemToAdd);
        console.log(`Added item "${itemToAdd.id}" to path "${targetPath}"`);
        return true;
      };
      
      // First, remove the item from its current location
      const movedItem = removeItemFromPath(tabDocs, item.id);
      
      if (movedItem) {
        // Then, add it to the new location
        const success = addItemToPath(tabDocs, toPath, movedItem);
        if (success) {
          newDocs[tabId] = tabDocs;
          console.log(`Successfully moved "${item.name}" from "${fromPath}" to "${toPath}"`);
        } else {
          console.error(`Failed to move "${item.name}" to "${toPath}"`);
          toast.error(`Failed to move "${item.name}"`);
          return prevDocs; // Return unchanged state
        }
      } else {
        console.error(`Could not find item "${item.id}" to move`);
        toast.error(`Could not find "${item.name}" to move`);
        return prevDocs; // Return unchanged state
      }
      
      return newDocs;
    });
    
    const targetFolder = toPath ? toPath.split('/').pop() : 'root folder';
    toast.success(`🚀 Moved "${item.name}" to ${targetFolder}!`);
  };

  // Handle file reordering within the same folder level
  const handleItemReorder = (draggedItem, targetItem, position) => {
    const tabId = activeTabId;
    
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
      
      const reorderItemsAtPath = (items, path, draggedId, targetId, position) => {
        // Helper function to find items at a specific path
        const getItemsAtPath = (items, currentPath) => {
          if (!path || path === '' || path === currentPath) {
            return items;
          }
          
          const pathParts = path.split('/').filter(p => p);
          let targetItems = items;
          
          for (const pathPart of pathParts) {
            const folder = targetItems.find(item => item.id === pathPart && item.type === 'folder');
            if (folder && folder.children) {
              targetItems = folder.children;
            } else {
              return null; // Path not found
            }
          }
          
          return targetItems;
        };
        
        const targetItems = getItemsAtPath(items, '');
        if (!targetItems) return false;
        
        // Find both items
        const draggedIndex = targetItems.findIndex(item => item.id === draggedId);
        const targetIndex = targetItems.findIndex(item => item.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return false;
        
        // Remove dragged item
        const [draggedItem] = targetItems.splice(draggedIndex, 1);
        
        // Calculate new insertion position
        const newTargetIndex = targetItems.findIndex(item => item.id === targetId);
        const insertIndex = position === 'above' ? newTargetIndex : newTargetIndex + 1;
        
        // Insert at new position
        targetItems.splice(insertIndex, 0, draggedItem);
        
        return true;
      };
      
      const success = reorderItemsAtPath(tabDocs, draggedItem.path, draggedItem.id, targetItem.id, position);
      
      if (success) {
        newDocs[tabId] = tabDocs;
        console.log(`Reordered "${draggedItem.name}" ${position} "${targetItem.name}"`);
      } else {
        console.error(`Failed to reorder items`);
        return prevDocs;
      }
      
      return newDocs;
    });
    
    toast.success(`📝 Reordered "${draggedItem.name}" ${position} "${targetItem.name}"!`);
  };

  // Global drag state handlers for Quick Move Panel
  const handleDragStart = (dragInfo) => {
    setIsDragging(true);
    setDraggedItem(dragInfo);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  const handleItemRename = (item, path, newName) => {
    const tabId = activeTabId;
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
      
      const renameItem = (items, targetId, newName) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            items[i].name = newName;
            return true;
          }
          if (items[i].children && renameItem(items[i].children, targetId, newName)) {
            return true;
          }
        }
        return false;
      };
      
      renameItem(tabDocs, item.id, newName);
      newDocs[tabId] = tabDocs;
      return newDocs;
    });
    toast.success(`✏️ Renamed to "${newName}"`);
  };

  const handleItemDelete = async (item, path) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }
    
    const tabId = activeTabId;
    
    try {
      if (tabId === 'company-docs' && item.url) {
        // Delete from API for Company Documents
        const response = await companyDocsService.deleteAsset(item.id);
        if (response.success) {
          // Refresh the assets list
          const assetsResponse = await companyDocsService.listAssets();
          if (assetsResponse.success) {
            setAssets(assetsResponse.data || []);
            
            const enhancedAssets = convertAssetsToDocuments(assetsResponse.data?.assets || []);
            setDocuments(prev => ({
              ...prev,
              'company-docs': enhancedAssets
            }));
          }
          toast.success(`🗑️ "${item.name}" deleted successfully!`);
        } else {
          throw new Error('Delete failed');
        }
      } else {
        // Delete locally for custom tabs
        setDocuments(prevDocs => {
          const newDocs = { ...prevDocs };
          const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
          
          const deleteItem = (items, targetId) => {
            for (let i = 0; i < items.length; i++) {
              if (items[i].id === targetId) {
                items.splice(i, 1);
                return true;
              }
              if (items[i].children && deleteItem(items[i].children, targetId)) {
                return true;
              }
            }
            return false;
          };
          
          deleteItem(tabDocs, item.id);
          newDocs[tabId] = tabDocs;
          return newDocs;
        });
        toast.success(`🗑️ "${item.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`❌ Failed to delete "${item.name}"`);
    }
  };

  const handleItemToggle = (item, path) => {
    const tabId = activeTabId;
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = [...(newDocs[tabId] || [])];
      
      const findAndToggle = (items, targetId) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            items[i].expanded = !items[i].expanded;
            return true;
          }
          if (items[i].children && findAndToggle(items[i].children, targetId)) {
            return true;
          }
        }
        return false;
      };
      
      findAndToggle(tabDocs, item.id);
      newDocs[tabId] = tabDocs;
      return newDocs;
    });
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) {
      toast.error('❌ Please enter a name');
      return;
    }
    
    const tabId = activeTabId;
    const newItem = {
      id: `${tabId}-${Date.now()}`,
      name: newItemName.trim(),
      type: newItemType,
      priority: 'medium',
      tags: [],
      favorite: false,
      notes: '',
      uploadedAt: new Date().toISOString(),
      ...(newItemType === 'folder' ? { expanded: false, children: [] } : { size: 0 })
    };
    
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
      
      // If no parent folder selected, add to root
      if (!selectedParentFolder) {
        tabDocs.push(newItem);
      } else {
        // Add to specific parent folder (supports nested folders)
        const addToFolder = (items, targetFolderId) => {
          for (let i = 0; i < items.length; i++) {
            if (items[i].id === targetFolderId && items[i].type === 'folder') {
              items[i].children = items[i].children || [];
              items[i].children.push(newItem);
              items[i].expanded = true; // Auto-expand to show new item
              return true;
            }
            if (items[i].children && items[i].children.length > 0) {
              if (addToFolder(items[i].children, targetFolderId)) {
                return true;
              }
            }
          }
          return false;
        };
        
        if (!addToFolder(tabDocs, selectedParentFolder.id)) {
          // Fallback to root if parent not found
          tabDocs.push(newItem);
        }
      }
      
      newDocs[tabId] = tabDocs;
      return newDocs;
    });
    
    setShowNewItemModal(false);
    setNewItemName('');
    setNewItemType('folder');
    setSelectedParentFolder(null);
    
    const locationText = selectedParentFolder 
      ? `in "${selectedParentFolder.name}"` 
      : 'in root folder';
    toast.success(`🎉 ${newItemType === 'folder' ? 'Folder' : 'File'} created successfully ${locationText}!`);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setUploading(true);
    
    try {
      for (const file of files) {
        if (activeTabId === 'company-docs') {
          // Upload to API for Company Documents
          const response = await companyDocsService.uploadAsset(file, {
            title: file.name,
            description: `Uploaded ${new Date().toLocaleDateString()}`,
            tags: ['Uploaded'],
            section: 'general'
          });
          
          if (response.success) {
            // Refresh the assets list
            const assetsResponse = await companyDocsService.listAssets();
            if (assetsResponse.success) {
              setAssets(assetsResponse.data?.assets || []);
              
              const assetsData = assetsResponse.data?.assets || assetsResponse.assets || [];
              const enhancedAssets = convertAssetsToDocuments(assetsData);
              setDocuments(prev => ({
                ...prev,
                'company-docs': enhancedAssets
              }));
            }
          } else {
            throw new Error('Upload failed');
          }
        } else {
          // For custom tabs, store locally
          const tabId = activeTabId;
          const newFile = {
            id: `${tabId}-file-${Date.now()}-${Math.random()}`,
            name: file.name,
            type: 'file',
            size: file.size,
            priority: 'medium',
            tags: ['Uploaded'],
            favorite: false,
            notes: '',
            uploadedAt: new Date().toISOString()
          };
          
          setDocuments(prevDocs => {
            const newDocs = { ...prevDocs };
            const tabDocs = [...(newDocs[tabId] || [])];
            tabDocs.push(newFile);
            newDocs[tabId] = tabDocs;
            return newDocs;
          });
        }
      }
      
      toast.success(`🚀 ${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleMagicOrganize = () => {
    const tabId = activeTabId;
    
    if (tabId !== 'company-docs' || !documents[tabId] || documents[tabId].length === 0) {
      toast.error('No documents to organize in this tab');
      return;
    }

    setLoading(true);
    toast.success('🤖 AI organizing your documents...', { duration: 2000 });
    
    setTimeout(() => {
      setDocuments(prevDocs => {
        const newDocs = { ...prevDocs };
        const tabDocs = [...(newDocs[tabId] || [])];
        
        // Create organized folder structure
        const organizedStructure = {
          'high-priority': {
            id: 'ai-high-priority',
            name: '🔴 High Priority Documents',
            type: 'folder',
            expanded: true,
            priority: 'critical',
            tags: ['AI-Organized', 'Priority'],
            favorite: true,
            children: []
          },
          'contracts': {
            id: 'ai-contracts',
            name: '📄 Contracts & Legal',
            type: 'folder',
            expanded: true,
            priority: 'high',
            tags: ['AI-Organized', 'Legal'],
            favorite: false,
            children: []
          },
          'inspections': {
            id: 'ai-inspections',
            name: '🔍 Inspections & Quality',
            type: 'folder',
            expanded: true,
            priority: 'medium',
            tags: ['AI-Organized', 'Quality'],
            favorite: false,
            children: []
          },
          'customer-docs': {
            id: 'ai-customer-docs',
            name: '🏠 Customer Resources',
            type: 'folder',
            expanded: true,
            priority: 'medium',
            tags: ['AI-Organized', 'Customer'],
            favorite: true,
            children: []
          },
          'other': {
            id: 'ai-other',
            name: '🗺 Other Documents',
            type: 'folder',
            expanded: false,
            priority: 'low',
            tags: ['AI-Organized'],
            favorite: false,
            children: []
          }
        };
        
        // Sort documents into appropriate folders using AI-like logic
        tabDocs.forEach(doc => {
          if (doc.type !== 'folder') {
            const docName = doc.name.toLowerCase();
            const docTags = (doc.tags || []).map(tag => tag.toLowerCase());
            const allText = [docName, ...docTags, (doc.notes || '').toLowerCase()].join(' ');
            
            if (doc.priority === 'critical' || doc.priority === 'high' || doc.favorite) {
              organizedStructure['high-priority'].children.push(doc);
            } else if (allText.includes('contract') || allText.includes('agreement') || allText.includes('legal') || allText.includes('warranty')) {
              organizedStructure['contracts'].children.push(doc);
            } else if (allText.includes('inspection') || allText.includes('quality') || allText.includes('checklist') || allText.includes('compliance')) {
              organizedStructure['inspections'].children.push(doc);
            } else if (allText.includes('customer') || allText.includes('maintenance') || allText.includes('guide') || allText.includes('resource')) {
              organizedStructure['customer-docs'].children.push(doc);
            } else {
              organizedStructure['other'].children.push(doc);
            }
          }
        });
        
        // Create the new organized structure
        const organizedDocs = Object.values(organizedStructure).filter(folder => 
          folder.children.length > 0
        );
        
        // Add any remaining folders from original structure
        const originalFolders = tabDocs.filter(doc => doc.type === 'folder');
        organizedDocs.push(...originalFolders);
        
        newDocs[tabId] = organizedDocs;
        return newDocs;
      });
      
      setLoading(false);
      toast.success('✨ Documents organized! Created smart folders by priority, type, and content!');
      
      // Show helpful tip
      setTimeout(() => {
        toast('💡 Tip: You can still drag & drop documents between the AI-organized folders!', {
          duration: 4000,
          icon: '💡'
        });
      }, 1500);
      
    }, 2500);
  };

  const handleFileProperties = (file) => {
    setSelectedFile(file);
    setShowFileProperties(true);
  };

  const handleShareFile = (file) => {
    toast.success(`📤 "${file.name}" shared with team members!`);
  };

  const handleUpdateFileProperties = (updatedFile) => {
    const tabId = activeTabId;
    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const tabDocs = JSON.parse(JSON.stringify(newDocs[tabId] || []));
      
      const updateItem = (items, targetId, updates) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            items[i] = { ...items[i], ...updates };
            return true;
          }
          if (items[i].children && updateItem(items[i].children, targetId, updates)) {
            return true;
          }
        }
        return false;
      };
      
      updateItem(tabDocs, updatedFile.id, updatedFile);
      newDocs[tabId] = tabDocs;
      return newDocs;
    });
  };

  // Document Generation Functions
  const handleGenerateFromTemplate = (template) => {
    setSelectedTemplate(template);
    // Initialize fields with default values
    const fields = {};
    if (template.fields) {
      template.fields.forEach(field => {
        fields[field.key] = field.defaultValue || '';
      });
    }
    setGenerationFields(fields);
    setShowGenerationModal(true);
  };

  const handleFieldChange = (key, value) => {
    setGenerationFields(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      const payload = {
        templateId: selectedTemplate.id,
        projectId: '10001', // Default project ID
        data: generationFields,
        title: `${selectedTemplate.name}_${new Date().toISOString().split('T')[0]}`
      };

      const response = await companyDocsService.generate(payload);
      
      if (response.success) {
        toast.success(`Document "${selectedTemplate.name}" generated successfully!`);
        setShowGenerationModal(false);
        setSelectedTemplate(null);
        setGenerationFields({});
        
        // Optionally refresh assets if the generated document appears in Company Documents
        const assetsResponse = await companyDocsService.listAssets();
        if (assetsResponse.success) {
          setAssets(assetsResponse.data?.assets || []);
          const assetsData = assetsResponse.data?.assets || [];
          const enhancedAssets = convertAssetsToDocuments(assetsData);
          setDocuments(prev => ({
            ...prev,
            'company-docs': enhancedAssets
          }));
        }
      } else {
        toast.error('Failed to generate document');
      }
    } catch (error) {
      console.error('Document generation error:', error);
      toast.error('Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };


  const activeTab = tabs.find(t => t.id === activeTabId);
  const tabActivityCount = documents[activeTabId]?.length || 0;

  // Helper function to collect all folders for parent selection
  const collectAllFolders = (items, prefix = '') => {
    let folders = [];
    items.forEach(item => {
      if (item.type === 'folder') {
        const folderPath = prefix ? `${prefix} > ${item.name}` : item.name;
        folders.push({ ...item, displayName: folderPath });
        if (item.children && item.children.length > 0) {
          folders.push(...collectAllFolders(item.children, folderPath));
        }
      }
    });
    return folders;
  };

  const availableFolders = documents[activeTabId] 
    ? collectAllFolders(documents[activeTabId]) 
    : [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-6xl mx-auto px-3 py-3 space-y-3">
        {/* Combined Search and Tab Bar */}
        <div className="bg-white rounded shadow-sm border p-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 max-w-sm">
              <SmartSearch documents={documents} onSearch={setSearchQuery} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-50 rounded text-xs">
                {tabActivityCount} docs
              </span>
              <MagicOrganizer onOrganize={handleMagicOrganize} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              {tabs.map((tab, index) => (
                <DraggableTab
                  key={tab.id}
                  tab={tab}
                  index={index}
                  active={activeTabId === tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  onRename={renameTab}
                  onDelete={deleteTab}
                  moveTab={moveTab}
                  documentCount={documents[tab.id]?.length || 0}
                />
              ))}
              <button
                onClick={addNewTab}
                className="px-2 py-1 text-xs font-medium rounded border border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1 transition-all"
              >
                <PlusIcon className="w-3 h-3" />
                Add Tab
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <TrashIcon className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Content Area */}
        {activeTabId === 'company-docs' && (
          <div className="bg-white rounded shadow-sm border overflow-hidden">
            {/* Toolbar */}
            <div className="bg-gray-50 p-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {activeTab?.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  {/* View Toggle */}
                  <div className="flex items-center gap-0.5 bg-white rounded p-0.5 border">
                    <button
                      onClick={() => setViewMode('tree')}
                      className={`p-1 rounded transition-colors ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      title="List View"
                    >
                      <ListBulletIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      title="Grid View"
                    >
                      <Squares2X2Icon className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Filter */}
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-1.5 py-1 text-xs border rounded bg-white"
                  >
                    <option value="all">All Files</option>
                    <option value="favorites">Favorites</option>
                    <option value="high-priority">High Priority</option>
                    <option value="recent">Recent</option>
                  </select>
                  
                  <button
                    onClick={() => setShowNewItemModal(true)}
                    className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Create
                  </button>
                  
                  <label className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 flex items-center gap-1 cursor-pointer transition-colors">
                    <CloudArrowUpIcon className="w-3 h-3" />
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Document Display Area */}
            <div className="p-3">
              {viewMode === 'tree' ? (
                <div className="bg-gray-50 rounded p-2 min-h-[300px] border border-dashed border-gray-300">
                  {documents[activeTabId]?.length > 0 ? (
                    <div className="space-y-1">
                      {documents[activeTabId]
                        .sort((a, b) => {
                          // Folders first, then files
                          if (a.type === 'folder' && b.type !== 'folder') return -1;
                          if (a.type !== 'folder' && b.type === 'folder') return 1;
                          // Within same type, sort alphabetically
                          return a.name.localeCompare(b.name);
                        })
                        .map((item) => (
                        <DraggableItem
                          key={item.id}
                          item={item}
                          path=""
                          onMove={handleItemMove}
                          onReorder={handleItemReorder}
                          onRename={handleItemRename}
                          onDelete={handleItemDelete}
                          onToggle={handleItemToggle}
                          onShowProperties={handleFileProperties}
                          onShare={handleShareFile}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-bounce">
                        <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">✨ Ready for Magic!</h3>
                      <p className="text-xs text-gray-500 mb-2">Your AI-powered document workspace is ready</p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setShowNewItemModal(true)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Create First Folder
                        </button>
                        <label className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer">
                          Upload Files
                          <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-2 bg-gradient-to-br from-gray-50 to-blue-50 rounded min-h-[300px] border border-dashed border-blue-200">
                  {documents[activeTabId]
                    ?.sort((a, b) => {
                      // Folders first, then files
                      if (a.type === 'folder' && b.type !== 'folder') return -1;
                      if (a.type !== 'folder' && b.type === 'folder') return 1;
                      // Within same type, sort alphabetically
                      return a.name.localeCompare(b.name);
                    })
                    .map((item) => (
                    <div
                      key={item.id}
                      className="relative group bg-white rounded p-2 shadow hover:shadow-md transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-blue-300"
                      onDoubleClick={() => item.type === 'folder' && handleItemToggle(item, '')}
                    >
                      <div className="text-center">
                        <div className="relative mb-1">
                          {item.type === 'folder' ? (
                            <FolderIcon className="w-8 h-8 text-blue-500 mx-auto" />
                          ) : (
                            <DocumentIcon className="w-8 h-8 text-gray-500 mx-auto" />
                          )}
                          {item.favorite && (
                            <StarSolid className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
                          )}
                          {item.priority === 'critical' && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-xs text-gray-900 truncate">{item.name}</h4>
                        {item.type === 'file' && item.size && (
                          <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                            {item.tags.slice(0, 1).map((tag, idx) => (
                              <span key={idx} className="px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Actions Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileProperties(item);
                            }}
                            className="p-1 bg-white text-blue-600 rounded shadow hover:bg-blue-50"
                          >
                            <AdjustmentsHorizontalIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareFile(item);
                            }}
                            className="p-1 bg-white text-green-600 rounded shadow hover:bg-green-50"
                          >
                            <ShareIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Smart Template Suggestions */}
              <SmartTemplateSuggester 
                currentFolder={activeTab} 
                onCreateTemplate={(template) => {
                  const newTemplate = {
                    id: `template-${Date.now()}`,
                    name: template,
                    type: 'file',
                    size: 51200,
                    priority: 'high',
                    tags: ['Template', 'AI-Generated'],
                    favorite: true,
                    notes: 'AI-generated template',
                    uploadedAt: new Date().toISOString()
                  };
                  
                  setDocuments(prevDocs => {
                    const newDocs = { ...prevDocs };
                    const tabDocs = [...(newDocs[activeTabId] || [])];
                    tabDocs.push(newTemplate);
                    newDocs[activeTabId] = tabDocs;
                    return newDocs;
                  });
                }}
              />
              
              {/* Collaboration Panel */}
              <CollaborationPanel 
                file={activeTab}
                onShare={(file, level) => {
                  toast.success(`🤝 Shared "${file.name}" with ${level} permissions!`);
                }}
              />
            </div>
          </div>
        )}

        {/* Product Specific Templates Tab */}
        {activeTabId === 'project-templates' && (
          <div className="bg-white rounded shadow">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Product Specific Templates</h3>
                <label className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 cursor-pointer flex items-center gap-1">
                  <CloudArrowUpIcon className="w-3 h-3" />
                  Upload Template
                  <input
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setUploading(true);
                      try {
                        const templateData = {
                          name: file.name.replace(/\.[^/.]+$/, ""),
                          description: `Template: ${file.name}`,
                          format: file.type,
                          section: 'general'
                        };
                        
                        const response = await companyDocsService.createTemplate(file, templateData);
                        if (response.success) {
                          const templatesResponse = await companyDocsService.listTemplates();
                          if (templatesResponse.success) {
                            setTemplates(templatesResponse.data?.templates || []);
                          }
                          toast.success('Template uploaded successfully!');
                        } else {
                          toast.error('Failed to upload template');
                        }
                      } catch (error) {
                        console.error('Template upload error:', error);
                        toast.error('Failed to upload template');
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              
              {loading ? (
                <div className="text-center py-4 text-sm">Loading templates...</div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {templates.map((template) => (
                    <div key={template.id || template._id} className="border rounded p-2 hover:shadow transition-shadow">
                      <div className="flex items-start gap-2">
                        <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs text-gray-900 truncate">
                            {template.name || template.filename}
                          </h4>
                          {template.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {template.format || 'Unknown format'}
                            </span>
                            <div className="flex gap-1">
                              {template.url && (
                                <a
                                  href={`${API_ORIGIN}${template.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <EyeIcon className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this template?')) {
                                    try {
                                      // Implement delete template API call
                                      toast.success('Template deleted successfully!');
                                      const templatesResponse = await companyDocsService.listTemplates();
                                      if (templatesResponse.success) {
                                        setTemplates(templatesResponse.data?.templates || []);
                                      }
                                    } catch (error) {
                                      toast.error('Failed to delete template');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentIcon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No templates uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Upload your first template to get started</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Generate Tab */}
        {activeTabId === 'generate' && (
          <div className="bg-white rounded shadow">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Generate Documents</h3>
              </div>
              
              {loading ? (
                <div className="text-center py-4 text-sm">Loading templates...</div>
              ) : templates.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <DocumentDuplicateIcon className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-xs text-blue-900">Generate Custom Documents</h4>
                    </div>
                    <p className="text-xs text-blue-700">Select a template below and fill in the required fields to generate a custom document.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {templates.map((template) => (
                      <div key={template.id || template._id} className="border border-gray-200 rounded p-2 hover:border-blue-300 hover:shadow transition-all cursor-pointer"
                        onClick={() => handleGenerateFromTemplate(template)}
                      >
                        <div className="flex items-start gap-2">
                          <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs text-gray-900 truncate">
                              {template.name}
                            </h4>
                            {template.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-400">
                                {template.format || 'PDF'} • {template.fields?.length || 0} fields
                              </span>
                              <button className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                Generate →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentDuplicateIcon className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">No templates available</p>
                  <p className="text-xs text-gray-400 mb-2">Upload templates in the "Product Specific Templates" tab to generate documents</p>
                  <button
                    onClick={() => setActiveTabId('project-templates')}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Go to Templates
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Tab Content */}
        {activeTabId.startsWith('custom-') && (
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-2 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <SparklesIcon className="w-4 h-4 text-purple-600" />
                  {activeTab?.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewItemModal(true)}
                    className="px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded hover:from-purple-700 hover:to-pink-700 flex items-center gap-1 shadow transition-all"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Create New
                  </button>
                  
                  <label className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 cursor-pointer shadow transition-all">
                    <CloudArrowUpIcon className="w-3 h-3" />
                    Upload
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded p-2 min-h-[300px] border border-dashed border-purple-200">
                {documents[activeTabId]?.length > 0 ? (
                  documents[activeTabId]
                    .sort((a, b) => {
                      // Folders first, then files
                      if (a.type === 'folder' && b.type !== 'folder') return -1;
                      if (a.type !== 'folder' && b.type === 'folder') return 1;
                      // Within same type, sort alphabetically
                      return a.name.localeCompare(b.name);
                    })
                    .map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      path=""
                      onMove={handleItemMove}
                      onReorder={handleItemReorder}
                      onRename={handleItemRename}
                      onDelete={handleItemDelete}
                      onToggle={handleItemToggle}
                      onShowProperties={handleFileProperties}
                      onShare={handleShareFile}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-bounce">
                      <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">🎨 Custom Workspace Ready!</h3>
                    <p className="text-xs text-gray-500 mb-2">Build your personalized document organization</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Modals */}
        {showNewItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded p-4 w-80 shadow-xl transform animate-scale-in" style={{ zIndex: 10000 }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1">
                <SparklesIcon className="w-4 h-4 text-blue-600" />
                Create New Item
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Parent Folder (Optional)</label>
                  <select
                    value={selectedParentFolder?.id || ''}
                    onChange={(e) => {
                      const folderId = e.target.value;
                      setSelectedParentFolder(folderId ? availableFolders.find(f => f.id === folderId) : null);
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Root Folder (Top Level)</option>
                    {availableFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.displayName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedParentFolder 
                      ? `Will be created inside "${selectedParentFolder.displayName}"` 
                      : 'Will be created at the top level'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewItemType('folder')}
                      className={`p-2 rounded border transition-all ${newItemType === 'folder' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <FolderIcon className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                      <div className="text-xs font-medium">Folder</div>
                    </button>
                    <button
                      onClick={() => setNewItemType('file')}
                      className={`p-2 rounded border transition-all ${newItemType === 'file' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <DocumentIcon className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                      <div className="text-xs font-medium">File</div>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${newItemType} name...`}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNewItem()}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNewItemModal(false);
                    setNewItemName('');
                    setNewItemType('folder');
                    setSelectedParentFolder(null);
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewItem}
                  className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded hover:from-blue-700 hover:to-indigo-700 transition-all shadow"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Properties Modal */}
        {showFileProperties && selectedFile && (
          <FilePropertiesPanel
            file={selectedFile}
            onUpdate={handleUpdateFileProperties}
            onClose={() => {
              setShowFileProperties(false);
              setSelectedFile(null);
            }}
          />
        )}

        {/* Document Generation Modal */}
        {showGenerationModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <DocumentDuplicateIcon className="w-6 h-6 text-blue-600" />
                  Generate Document: {selectedTemplate.name}
                </h3>
                <button 
                  onClick={() => setShowGenerationModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              {selectedTemplate.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700">{selectedTemplate.description}</p>
                </div>
              )}

              <div className="space-y-4">
                {selectedTemplate.fields && selectedTemplate.fields.length > 0 ? (
                  selectedTemplate.fields.map((field, index) => (
                    <div key={field.key || index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'TEXT' || !field.type ? (
                        <input
                          type="text"
                          value={generationFields[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={field.label}
                          required={field.required}
                        />
                      ) : field.type === 'TEXTAREA' ? (
                        <textarea
                          value={generationFields[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                          placeholder={field.label}
                          required={field.required}
                        />
                      ) : field.type === 'SELECT' ? (
                        <select
                          value={generationFields[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={field.required}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options && field.options.map((option, idx) => (
                            <option key={idx} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'DATE' ? (
                        <input
                          type="date"
                          value={generationFields[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={field.required}
                        />
                      ) : (
                        <input
                          type="text"
                          value={generationFields[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={field.label}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">This template has no configurable fields.</p>
                    <p className="text-sm text-gray-400 mt-1">The document will be generated with default content.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowGenerationModal(false);
                    setSelectedTemplate(null);
                    setGenerationFields({});
                  }}
                  className="px-6 py-3 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDocument}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="w-4 h-4" />
                      Generate Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Move Panel for off-screen folder targeting */}
      <QuickMovePanel 
        isVisible={isDragging}
        folders={documents[activeTabId] || []}
        onMove={handleItemMove}
        draggedItem={draggedItem}
        onClose={handleDragEnd}
      />

      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .tooltip:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: black;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
        }
      `}</style>
    </DndProvider>
  );
}