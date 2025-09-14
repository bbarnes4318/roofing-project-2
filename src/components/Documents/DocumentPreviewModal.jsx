import React, { useState } from 'react';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  HeartIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const DocumentPreviewModal = ({ document, onClose, onDownload }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [showComments, setShowComments] = useState(false);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const renderPreview = () => {
    if (document.mimeType?.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg">
          <img
            src={document.fileUrl}
            alt={document.title || document.originalName}
            className="max-w-full max-h-96 object-contain"
          />
        </div>
      );
    }

    if (document.mimeType === 'application/pdf') {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg h-96">
          <div className="text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">PDF Preview</p>
            <button
              onClick={() => onDownload(document.id)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Download to View
            </button>
          </div>
        </div>
      );
    }

    // For other file types, show a placeholder
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-96">
        <div className="text-center">
          <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Preview not available</p>
          <button
            onClick={() => onDownload(document.id)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Download to View
          </button>
        </div>
      </div>
    );
  };

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">File Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{document.originalName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">File Size</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatFileSize(document.fileSize)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">File Type</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFileTypeColor(document.fileType)}`}>
                {document.fileType}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">
              {document.category?.toLowerCase().replace('_', ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Access Level</dt>
            <dd className="mt-1 text-sm text-gray-900">{document.accessLevel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Version</dt>
            <dd className="mt-1 text-sm text-gray-900">{document.version}</dd>
          </div>
        </dl>
      </div>

      {/* Description */}
      {document.description && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-700">{document.description}</p>
        </div>
      )}

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {document.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                <TagIcon className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Project Information */}
      {document.project && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Project</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">{document.project.name}</p>
            <p className="text-xs text-gray-500">Project #{document.project.projectNumber}</p>
            {document.project.customer && (
              <p className="text-xs text-gray-500 mt-1">
                Customer: {document.project.customer.name}
                {document.project.customer.company && ` (${document.project.customer.company})`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Information</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Uploaded By</dt>
            <dd className="mt-1 text-sm text-gray-900">{document.uploadedBy?.name || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(document.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(document.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Download Count</dt>
            <dd className="mt-1 text-sm text-gray-900">{document.downloadCount || 0}</dd>
          </div>
        </dl>
      </div>

      {/* Special Properties */}
      {(document.isTemplate || document.requiresSignature || document.expiryDate) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Special Properties</h3>
          <div className="space-y-2">
            {document.isTemplate && (
              <div className="flex items-center text-sm text-blue-600">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                This is a template document
              </div>
            )}
            {document.requiresSignature && (
              <div className="flex items-center text-sm text-orange-600">
                <span className="w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
                Requires signature
                {document.signatureRequiredBy && (
                  <span className="ml-2 text-gray-500">
                    (by {formatDate(document.signatureRequiredBy)})
                  </span>
                )}
              </div>
            )}
            {document.expiryDate && (
              <div className="flex items-center text-sm text-red-600">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                Expires on {formatDate(document.expiryDate)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderComments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700">
          Add Comment
        </button>
      </div>
      
      {document.comments && document.comments.length > 0 ? (
        <div className="space-y-4">
          {document.comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {comment.author?.firstName?.charAt(0) || comment.author?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {comment.author?.firstName && comment.author?.lastName 
                        ? `${comment.author.firstName} ${comment.author.lastName}`
                        : comment.author?.name || 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isInternal && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-white rounded p-3">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {reply.author?.firstName && reply.author?.lastName 
                                ? `${reply.author.firstName} ${reply.author.lastName}`
                                : reply.author?.name || 'Unknown'}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No comments yet</p>
          <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
            Be the first to comment
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {document.title || document.originalName}
              </h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(document.fileSize)} • {document.fileType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDownload(document.id)}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
              title="Download"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Add to Favorites"
            >
              {document.isFavorite ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </button>
            <button
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Share"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Comments ({document.comments?.length || 0})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'preview' && renderPreview()}
          {activeTab === 'details' && renderDetails()}
          {activeTab === 'comments' && renderComments()}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-1" />
              Uploaded {formatDate(document.createdAt)}
            </span>
            <span className="flex items-center">
              <UserIcon className="w-4 h-4 mr-1" />
              {document.uploadedBy?.name || 'Unknown'}
            </span>
            <span className="flex items-center">
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              {document.downloadCount || 0} downloads
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => onDownload(document.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
