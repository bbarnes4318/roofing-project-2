import React from 'react';
import {
  HeartIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const DocumentCard = ({ 
  document, 
  viewMode = 'grid', 
  onFavoriteToggle, 
  onDownload, 
  onPreview 
}) => {
  const getFileIcon = (mimeType, fileType) => {
    if (mimeType?.startsWith('image/')) return PhotoIcon;
    if (fileType === 'PDF' || mimeType === 'application/pdf') return DocumentTextIcon;
    return DocumentIcon;
  };

  const getFileTypeColor = (fileType) => {
    const colors = {
      CONTRACT: 'bg-green-100 text-green-800',
      WARRANTY: 'bg-blue-100 text-blue-800',
      PERMIT: 'bg-yellow-100 text-yellow-800',
      INVOICE: 'bg-purple-100 text-purple-800',
      PHOTO: 'bg-pink-100 text-pink-800',
      REPORT: 'bg-indigo-100 text-indigo-800',
      FORM: 'bg-orange-100 text-orange-800',
      CHECKLIST: 'bg-cyan-100 text-cyan-800',
      MANUAL: 'bg-gray-100 text-gray-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return colors[fileType] || colors.OTHER;
  };

  const getCategoryColor = (category) => {
    const colors = {
      CONTRACTS: 'bg-green-50 border-green-200',
      WARRANTIES: 'bg-blue-50 border-blue-200',
      PERMITS: 'bg-yellow-50 border-yellow-200',
      INSPECTIONS: 'bg-purple-50 border-purple-200',
      ESTIMATES: 'bg-orange-50 border-orange-200',
      INVOICES: 'bg-pink-50 border-pink-200',
      PHOTOS: 'bg-cyan-50 border-cyan-200',
      REPORTS: 'bg-indigo-50 border-indigo-200',
      FORMS: 'bg-gray-50 border-gray-200',
      OTHER: 'bg-gray-50 border-gray-200'
    };
    return colors[category] || colors.OTHER;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileIcon = getFileIcon(document.mimeType, document.fileType);

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div className="p-4 flex items-center space-x-4">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg ${getCategoryColor(document.category)} flex items-center justify-center`}>
              <FileIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {document.title || document.originalName}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {document.description || 'No description available'}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {formatDate(document.createdAt)}
                  </span>
                  <span className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    {document.uploadedBy?.name || 'Unknown'}
                  </span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span className="flex items-center">
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    {document.downloadCount || 0} downloads
                  </span>
                </div>
              </div>

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-4">
                  {document.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {document.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{document.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(document.fileType)}`}>
              {document.fileType}
            </span>
            <button
              onClick={() => onFavoriteToggle(document.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              {document.isFavorite ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onPreview(document)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDownload(document.id)}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow group">
      {/* Thumbnail/Icon */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-lg overflow-hidden">
        {document.thumbnailUrl ? (
          <img
            src={document.thumbnailUrl}
            alt={document.title || document.originalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className={`w-full h-full ${getCategoryColor(document.category)} flex items-center justify-center`}>
            <FileIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {document.title || document.originalName}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {document.description || 'No description available'}
            </p>
          </div>
          <button
            onClick={() => onFavoriteToggle(document.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
          >
            {document.isFavorite ? (
              <HeartSolidIcon className="w-5 h-5 text-red-500" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {document.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
              >
                <TagIcon className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {document.tags.length > 2 && (
              <span className="text-xs text-gray-500">
                +{document.tags.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-1" />
              {formatDate(document.createdAt)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(document.fileType)}`}>
              {document.fileType}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <UserIcon className="w-4 h-4 mr-1" />
              {document.uploadedBy?.name || 'Unknown'}
            </span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>
          <div className="flex items-center">
            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
            {document.downloadCount || 0} downloads
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onPreview(document)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview
          </button>
          <button
            onClick={() => onDownload(document.id)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
