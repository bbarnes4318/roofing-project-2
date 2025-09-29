import React, { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { companyDocsService } from '../../services/api';
import toast from 'react-hot-toast';

const DocumentUploadZone = ({ 
  onUploadComplete, 
  parentId = null, 
  colorMode = false,
  className = '' 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    // Validate files
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      if (file.size > maxSize) {
        invalidFiles.push({ file, reason: 'File too large (max 50MB)' });
      } else if (!allowedTypes.includes(file.type)) {
        invalidFiles.push({ file, reason: 'File type not supported' });
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, reason }) => {
        toast.error(`${file.name}: ${reason}`);
      });
    }

    if (validFiles.length === 0) return;

    // Create upload entries
    const newUploads = validFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      error: null
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsUploading(true);

    // Upload files
    for (const upload of newUploads) {
      try {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'uploading', progress: 10 }
            : u
        ));

        const response = await companyDocsService.uploadAsset(upload.file, {
          title: upload.name,
          parentId: parentId,
          description: `Uploaded via drag & drop`
        });

        if (response.success) {
          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? { ...u, status: 'completed', progress: 100 }
              : u
          ));
          
          toast.success(`${upload.name} uploaded successfully`);
          
          // Call completion callback
          if (onUploadComplete) {
            onUploadComplete(response.data.asset);
          }
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: error.message }
            : u
        ));
        
        toast.error(`Failed to upload ${upload.name}`);
      }
    }

    setIsUploading(false);
  };

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'completed'));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('powerpoint')) return '📈';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    return '📄';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${colorMode ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' : 'bg-white'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.svg,.txt,.zip,.rar"
        />
        
        <div className="space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <CloudArrowUpIcon className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
              {isDragOver ? 'Drop files here' : 'Upload Documents'}
            </h3>
            <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
              Drag and drop files here, or click to browse
            </p>
            <p className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
              Supports PDF, Word, Excel, PowerPoint, images, and more (max 50MB each)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Upload Progress ({uploads.filter(u => u.status === 'completed').length}/{uploads.length})
            </h4>
            {uploads.some(u => u.status === 'completed') && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear completed
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {uploads.map(upload => (
              <div
                key={upload.id}
                className={`p-3 rounded-lg border ${
                  upload.status === 'completed' 
                    ? 'border-green-200 bg-green-50'
                    : upload.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg">{getFileIcon(upload.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {upload.status === 'completed' && (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                        )}
                        {upload.status === 'uploading' && (
                          <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                        <button
                          onClick={() => removeUpload(upload.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <XMarkIcon className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.size)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {upload.status === 'uploading' && `${upload.progress}%`}
                        {upload.status === 'completed' && 'Completed'}
                        {upload.status === 'error' && 'Failed'}
                        {upload.status === 'pending' && 'Pending'}
                      </p>
                    </div>
                    
                    {upload.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-[var(--color-primary-blueprint-blue)] h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {upload.error && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {upload.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadZone;
