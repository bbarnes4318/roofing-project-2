import React, { useState, useEffect } from 'react';
import { FolderIcon, XMarkIcon } from '@heroicons/react/24/outline';

const FolderRenameModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentName = '',
  colorMode = false 
}) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  // Initialize with current name when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError('');
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Folder name is required');
      return;
    }
    
    if (newName.trim() === currentName) {
      onClose();
      return;
    }
    
    if (newName.trim().length < 2) {
      setError('Folder name must be at least 2 characters');
      return;
    }
    
    if (newName.trim().length > 100) {
      setError('Folder name must be less than 100 characters');
      return;
    }
    
    onConfirm(newName.trim());
  };

  const handleCancel = () => {
    setNewName(currentName);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full ${
        colorMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          colorMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              colorMode ? 'bg-amber-900/20' : 'bg-amber-100'
            }`}>
              <FolderIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                Rename Folder
              </h3>
              <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Enter a new name for this folder
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className={`p-2 rounded-lg transition ${
              colorMode 
                ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              colorMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Folder Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              className={`w-full px-3 py-2 rounded-lg border text-sm transition ${
                error
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                  : colorMode
                  ? 'border-slate-600 bg-slate-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Enter folder name..."
              autoFocus
            />
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          colorMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <button
            onClick={handleCancel}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              colorMode
                ? 'border border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Rename Folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderRenameModal;
