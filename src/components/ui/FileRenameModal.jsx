import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { getFileTypeInfo } from '../../utils/fileTypeUtils';

const FileRenameModal = ({ 
  isOpen, 
  onClose, 
  files = [], 
  onConfirm, 
  onCancel,
  colorMode = false 
}) => {
  const [fileNames, setFileNames] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize file names when modal opens
  useEffect(() => {
    if (isOpen && files.length > 0) {
      const initialNames = {};
      files.forEach((file, index) => {
        initialNames[index] = file.name || `File ${index + 1}`;
      });
      setFileNames(initialNames);
      setErrors({});
    }
  }, [isOpen, files]);

  const handleNameChange = (index, newName) => {
    setFileNames(prev => ({
      ...prev,
      [index]: newName
    }));
    
    // Clear error for this file
    if (errors[index]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const validateNames = () => {
    const newErrors = {};
    const usedNames = new Set();
    
    Object.entries(fileNames).forEach(([index, name]) => {
      if (!name.trim()) {
        newErrors[index] = 'File name is required';
        return;
      }
      
      if (usedNames.has(name.trim())) {
        newErrors[index] = 'File name must be unique';
        return;
      }
      
      usedNames.add(name.trim());
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateNames()) {
      console.log('📝 FileRenameModal: Creating renamed files...');
      const renamedFiles = files.map((file, index) => {
        const newName = fileNames[index] || file.name;
        console.log(`  - File ${index}: "${file.name}" -> "${newName}"`);
        
        // Ensure we always work with a File object
        if (!(file instanceof File)) {
          console.error('❌ FileRenameModal: Invalid file object at index', index, file);
          throw new Error(`Invalid file object at index ${index}`);
        }
        
        // If the name hasn't changed, return the original file
        if (newName === file.name) {
          console.log(`  ✓ Keeping original name for: ${file.name}`);
          return file;
        }
        
        // Create a new File object with the new name
        // File objects are immutable, so we need to create a new one
        try {
          const renamedFile = new File([file], newName, {
            type: file.type,
            lastModified: file.lastModified || Date.now()
          });
          
          console.log(`  ✓ Created renamed file: "${renamedFile.name}" (${renamedFile.size} bytes, type: ${renamedFile.type})`);
          return renamedFile;
        } catch (error) {
          console.error('❌ FileRenameModal: Error creating File object:', error);
          throw new Error(`Failed to rename file "${file.name}": ${error.message}`);
        }
      });
      
      console.log('✅ FileRenameModal: All files processed, confirming upload...');
      
      // Wrap in try-catch to handle any errors gracefully
      try {
        onConfirm(renamedFiles);
      } catch (error) {
        console.error('❌ FileRenameModal: Error in onConfirm callback:', error);
        // Re-throw so the parent component can handle it
        throw error;
      }
    } else {
      console.warn('⚠️ FileRenameModal: Validation failed');
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  if (!isOpen || files.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ${
        colorMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          colorMode ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <div>
            <h3 className={`text-xl font-bold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              Rename Files
            </h3>
            <p className={`text-sm mt-1 ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {files.length} file{files.length > 1 ? 's' : ''} ready to upload
            </p>
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
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {files.map((file, index) => {
              const fileTypeInfo = getFileTypeInfo(file.type, file.name);
              const fileSize = (file.size / 1024 / 1024).toFixed(2);
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    colorMode 
                      ? 'border-slate-600 bg-slate-700/50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* File Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      colorMode ? 'bg-slate-600' : 'bg-gray-100'
                    }`}>
                      <span className="text-lg">{fileTypeInfo.icon}</span>
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                          {fileTypeInfo.type}
                        </span>
                        <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {fileSize} MB
                        </span>
                      </div>
                      
                      {/* File Name Input */}
                      <div>
                        <input
                          type="text"
                          value={fileNames[index] || ''}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition ${
                            errors[index]
                              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                              : colorMode
                              ? 'border-slate-600 bg-slate-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          placeholder="Enter file name..."
                        />
                        {errors[index] && (
                          <p className="mt-1 text-xs text-red-600">{errors[index]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Upload Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileRenameModal;
