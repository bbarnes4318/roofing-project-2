import React, { useState, useEffect } from 'react';
import { assetsService } from '../../services/assetsService';

const DocumentViewerModal = ({ document, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [fileType, setFileType] = useState(null);

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    }
    return () => {
      // Cleanup blob URL if created
      if (documentUrl && documentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [isOpen, document]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📄 Loading document:', document);

      // Determine file type from document
      const fileName = document.fileName || document.title || document.name || '';
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      let type = 'unknown';
      if (['pdf'].includes(extension)) {
        type = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        type = 'image';
      } else if (['doc', 'docx'].includes(extension)) {
        type = 'word';
      } else if (['xls', 'xlsx'].includes(extension)) {
        type = 'excel';
      } else if (['txt', 'md'].includes(extension)) {
        type = 'text';
      }
      
      setFileType(type);

      // If document has a URL, use it directly
      if (document.url) {
        setDocumentUrl(document.url);
        setLoading(false);
        return;
      }

      // If document has an assetId, fetch from backend
      if (document.assetId || document.id) {
        const assetId = document.assetId || document.id;

        // Try to get the asset details first
        try {
          const asset = await assetsService.get(assetId);
          if (asset?.url) {
            setDocumentUrl(asset.url);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not fetch asset details, trying direct download:', err);
        }

        // If no URL in asset details, try to download the file
        try {
          const { blob } = await assetsService.downloadBlob(assetId);
          const blobUrl = URL.createObjectURL(blob);
          setDocumentUrl(blobUrl);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Failed to download asset:', err);
          throw new Error('Could not load document from server');
        }
      }

      throw new Error('Document has no URL or asset ID');

    } catch (err) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-11/12 h-5/6 max-w-6xl bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold">
                {document?.title || document?.fileName || document?.name || 'Document Viewer'}
              </h2>
              {document?.fileSize && (
                <p className="text-xs text-blue-100">
                  {(document.fileSize / 1024).toFixed(2)} KB
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-4rem)] overflow-auto bg-gray-50">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to Load Document</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && documentUrl && (
            <>
              {fileType === 'pdf' && (
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              )}

              {fileType === 'image' && (
                <div className="flex items-center justify-center h-full p-8">
                  <img
                    src={documentUrl}
                    alt={document?.title || 'Document'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {fileType === 'text' && (
                <div className="p-8">
                  <iframe
                    src={documentUrl}
                    className="w-full h-full border-0 bg-white rounded"
                    title="Text Viewer"
                  />
                </div>
              )}

              {['word', 'excel', 'unknown'].includes(fileType) && (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <div className="w-20 h-20 mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {document?.title || document?.fileName || 'Document'}
                  </h3>
                  <p className="text-gray-600 mb-6 text-center max-w-md">
                    This file type cannot be previewed in the browser. Click the button below to download it.
                  </p>
                  <a
                    href={documentUrl}
                    download={document?.fileName || document?.title || 'document'}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;

