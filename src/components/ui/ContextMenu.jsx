import React, { useState, useEffect, useRef } from 'react';
import { 
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  StarIcon,
  ArchiveBoxIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const ContextMenu = ({ 
  isOpen, 
  position, 
  onClose, 
  item, 
  onAction,
  isFavorite = false,
  colorMode = false 
}) => {
  const menuRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 5000); // Auto-close after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFolder = item?.type === 'FOLDER';

  const menuItems = [
    {
      id: 'view',
      label: 'View',
      icon: <EyeIcon className="w-4 h-4" />,
      action: 'view',
      show: !isFolder
    },
    {
      id: 'download',
      label: 'Download',
      icon: <ArrowDownTrayIcon className="w-4 h-4" />,
      action: 'download',
      show: !isFolder
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <PencilIcon className="w-4 h-4" />,
      action: 'rename'
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      action: 'duplicate',
      show: !isFolder
    },
    {
      id: 'favorite',
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: isFavorite ? <StarSolid className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />,
      action: 'toggle-favorite'
    },
    {
      id: 'share',
      label: 'Share',
      icon: <ShareIcon className="w-4 h-4" />,
      action: 'share'
    },
    {
      id: 'move',
      label: 'Move to Folder',
      icon: <FolderIcon className="w-4 h-4" />,
      action: 'move'
    },
    {
      id: 'tag',
      label: 'Add Tag',
      icon: <TagIcon className="w-4 h-4" />,
      action: 'tag'
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <ArchiveBoxIcon className="w-4 h-4" />,
      action: 'archive',
      show: !isFolder
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      action: 'delete',
      className: 'text-red-600 hover:bg-red-50'
    }
  ];

  const visibleItems = menuItems.filter(item => item.show !== false);

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } transition-all duration-150`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -10px)'
      }}
    >
      {visibleItems.map((menuItem) => (
        <button
          key={menuItem.id}
          onClick={() => {
            onAction(menuItem.action, item);
            onClose();
          }}
          className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
            menuItem.className || 'text-gray-700'
          }`}
        >
          <span className="mr-3">{menuItem.icon}</span>
          {menuItem.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
