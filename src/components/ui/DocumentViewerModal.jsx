import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
      
      // Also check mimeType for more accurate file type detection
      const mimeType = document.mimeType || document.contentType || '';

      let type = 'unknown';
      if (['pdf'].includes(extension) || mimeType.includes('pdf')) {
        type = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension) || mimeType.startsWith('image/')) {
        type = 'image';
      } else if (['doc', 'docx'].includes(extension) || mimeType.includes('word') || mimeType.includes('document')) {
        type = 'word';
      } else if (['xls', 'xlsx'].includes(extension) || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        type = 'excel';
      } else if (['txt', 'md'].includes(extension) || mimeType.includes('text/plain')) {
        type = 'text';
      }

      setFileType(type);

      // Try multiple URL sources with fallbacks
      const possibleUrl = document.url || document.fileUrl || document.signedUrl || document.streamUrl;
      
      if (possibleUrl) {
        // Make sure URL is absolute
        let finalUrl = possibleUrl;
        if (!possibleUrl.startsWith('http://') && !possibleUrl.startsWith('https://') && !possibleUrl.startsWith('blob:')) {
          // Construct absolute URL
          const baseUrl = window.location.origin;
          finalUrl = possibleUrl.startsWith('/') ? `${baseUrl}${possibleUrl}` : `${baseUrl}/${possibleUrl}`;
        }
        
        console.log('✅ Using document URL:', finalUrl);
        setDocumentUrl(finalUrl);
        setLoading(false);
        return;
      }

      // If document has an assetId, fetch from backend
      if (document.assetId || document.id) {
        const assetId = document.assetId || document.id;

        // Get presigned URL for viewing from Digital Ocean Spaces
        try {
          const viewData = await assetsService.getViewUrl(assetId);
          console.log('✅ Got presigned view URL:', viewData);

          if (viewData?.url) {
            console.log('✅ Using presigned URL:', viewData.url);
            setDocumentUrl(viewData.url);
            setLoading(false);
            return;
          }

          throw new Error('No presigned URL returned');

        } catch (err) {
          console.error('Failed to get presigned URL:', err);
          throw new Error('Could not load document from server');
        }
      }

      // If no URL and no asset ID, show error
      throw new Error('Unable to load document. Missing URL or asset ID.');

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

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleBackdropClick}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="relative w-[90vw] h-[90vh] max-w-[1600px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Professional Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white border-b border-slate-600 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {document?.title || document?.fileName || document?.name || 'Document Viewer'}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                {document?.fileSize && (
                  <span className="text-sm text-slate-300">
                    {(document.fileSize / 1024).toFixed(1)} KB
                  </span>
                )}
                {fileType && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white/15 backdrop-blur-sm text-white uppercase tracking-wider border border-white/20">
                    {fileType}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (documentUrl) {
                  window.open(documentUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="h-[calc(100%-5rem)] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-700 text-lg font-medium">Loading document...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we prepare your file</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Failed to Load Document</h3>
              <p className="text-gray-600 mb-6 max-w-md text-center">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && documentUrl && (
            <>
              {fileType === 'pdf' && (
                <div className="w-full h-full relative bg-white">
                  <iframe
                    src={documentUrl}
                    className="w-full h-full border-0"
                    title={document?.title || 'PDF Document'}
                    onLoad={() => setLoading(false)}
                  />
                  {/* PDF Controls Overlay */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => {
                        const iframe = document.querySelector('iframe');
                        if (iframe) {
                          iframe.contentWindow.print();
                        }
                      }}
                      className="px-4 py-2.5 bg-white/95 backdrop-blur-sm text-gray-700 text-sm font-medium rounded-lg hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-gray-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                    <a
                      href={documentUrl}
                      download={document?.fileName || document?.title || 'document.pdf'}
                      className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              )}

              {fileType === 'image' && (
                <div className="flex items-center justify-center h-full p-8 bg-gray-100">
                  <div className="relative max-w-full max-h-full">
                    <img
                      src={documentUrl}
                      alt={document?.title || 'Document'}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      onLoad={() => setLoading(false)}
                    />
                    {/* Image controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => {
                          const img = document.querySelector('img');
                          if (img) {
                            const link = document.createElement('a');
                            link.href = img.src;
                            link.download = document?.fileName || document?.title || 'image';
                            link.click();
                          }
                        }}
                        className="px-3 py-2 bg-white bg-opacity-90 text-gray-700 text-sm font-medium rounded-lg hover:bg-opacity-100 transition-colors shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {fileType === 'text' && (
                <div className="h-full overflow-auto bg-white">
                  <div className="p-8">
                    <div className="max-w-4xl mx-auto">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-6 rounded-lg border">
                        {/* Text content will be loaded via fetch */}
                        Loading text content...
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {['word', 'excel', 'unknown'].includes(fileType) && (
                <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 mb-6 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      {document?.title || document?.fileName || 'Document'}
                    </h3>
                    <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                      This file type cannot be previewed in the browser. Download it to view the content.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a
                        href={documentUrl}
                        download={document?.fileName || document?.title || 'document'}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 text-lg font-semibold shadow-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download File
                      </a>
                      <button
                        onClick={() => window.open(documentUrl, '_blank', 'noopener,noreferrer')}
                        className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-3 text-lg font-semibold"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in New Tab
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DocumentViewerModal;

