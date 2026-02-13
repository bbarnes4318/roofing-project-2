import React from 'react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType = 'item',
  colorMode = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full ${
        colorMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 border-b ${
          colorMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            colorMode ? 'bg-red-900/20' : 'bg-red-100'
          }`}>
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              Delete {itemType}
            </h3>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
            Are you sure you want to delete <strong>"{itemName}"</strong>? 
            This {itemType} will be moved to the trash and permanently deleted after 90 days.
          </p>
          
          <div className={`p-3 rounded-lg ${
            colorMode ? 'bg-yellow-900/20 border border-yellow-600' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-xs ${colorMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <strong>Note:</strong> The {itemType} will be kept in the trash for 90 days before permanent deletion.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          colorMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              colorMode
                ? 'border border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            Delete {itemType}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
