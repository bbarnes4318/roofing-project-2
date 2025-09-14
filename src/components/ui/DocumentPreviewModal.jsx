import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  EyeIcon, 
  ClockIcon, 
  UserIcon,
  DocumentIcon,
  TagIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { companyDocsService } from '../../services/api';
import toast from 'react-hot-toast';

const DocumentPreviewModal = ({ 
  isOpen, 
  onClose, 
  documentId, 
  documentTitle,
  colorMode 
}) => {
  const [document, setDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocumentPreview();
    }
  }, [isOpen, documentId]);

  const loadDocumentPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await companyDocsService.getAssetPreview(documentId);
      if (response.success) {
        setDocument(response.data.asset);
        setVersions(response.data.versions || []);
      }
    } catch (err) {
      console.error('Error loading document preview:', err);
      setError('Failed to load document preview');
      toast.error('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await companyDocsService.downloadAsset(documentId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document?.title || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
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
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('powerpoint')) return '📈';
    return '📄';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${colorMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`${colorMode ? 'bg-gray-700' : 'bg-gray-50'} px-6 py-4 rounded-t-2xl border-b border-gray-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getFileIcon(document?.mimeType)}</div>
              <div>
                <h2 className={`text-lg font-semibold ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                  {document?.title || documentTitle || 'Document Preview'}
                </h2>
                <p className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {document?.mimeType} • {formatFileSize(document?.fileSize)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${colorMode ? 'bg-gray-700' : 'bg-gray-50'} px-6 py-2 border-b border-gray-200`}>
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-100 text-blue-700'
                  : colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <EyeIcon className="w-4 h-4 inline mr-2" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'details'
                  ? 'bg-blue-100 text-blue-700'
                  : colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentIcon className="w-4 h-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'versions'
                  ? 'bg-blue-100 text-blue-700'
                  : colorMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClockIcon className="w-4 h-4 inline mr-2" />
              Versions ({versions.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">Loading document preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={loadDocumentPreview}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="text-6xl mb-4">{getFileIcon(document?.mimeType)}</div>
                    <p className="text-gray-600">
                      Preview not available for this file type
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click download to view the file
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'details' && document && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">File Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{document.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{document.mimeType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">{formatFileSize(document.fileSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="font-medium">{formatDate(document.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Modified:</span>
                          <span className="font-medium">{formatDate(document.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Access:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            document.isPublic 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {document.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uploaded by:</span>
                          <span className="font-medium">
                            {document.uploadedBy?.firstName} {document.uploadedBy?.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{document.uploadedBy?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Folder:</span>
                          <span className="font-medium">
                            {document.parent?.title || 'Root'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {document.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                        {document.description}
                      </p>
                    </div>
                  )}

                  {document.tags && document.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {document.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            <TagIcon className="w-3 h-3 inline mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'versions' && (
                <div className="space-y-4">
                  {versions.length === 0 ? (
                    <div className="text-center py-8">
                      <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No version history available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {versions.map((version, index) => (
                        <div
                          key={version.id}
                          className={`p-4 rounded-lg border ${
                            index === 0 
                              ? 'border-blue-200 bg-blue-50' 
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">{getFileIcon(version.mimeType)}</div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  Version {version.versionNumber}
                                  {index === 0 && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      Current
                                    </span>
                                  )}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {version.description || 'No description'}
                                </p>
                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1" />
                                    {version.uploadedBy?.firstName} {version.uploadedBy?.lastName}
                                  </span>
                                  <span className="flex items-center">
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    {formatDate(version.createdAt)}
                                  </span>
                                  <span>{formatFileSize(version.fileSize)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  // Download specific version
                                  const link = document.createElement('a');
                                  link.href = version.fileUrl;
                                  link.download = `${document?.title}_v${version.versionNumber}`;
                                  link.click();
                                }}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <ArrowDownTrayIcon className="w-3 h-3 mr-1 inline" />
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
