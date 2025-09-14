import React from 'react';
import { 
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  ArchiveBoxIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

const FilePreviewCard = ({ 
  file, 
  size = 'large',
  showDetails = true,
  colorMode = false 
}) => {
  const getFileIcon = (mimeType, size = 'large') => {
    const iconClass = size === 'large' ? 'w-16 h-16' : 'w-8 h-8';
    
    if (mimeType?.includes('pdf')) {
      return <DocumentTextIcon className={`${iconClass} text-red-500`} />;
    }
    if (mimeType?.includes('image')) {
      return <PhotoIcon className={`${iconClass} text-green-500`} />;
    }
    if (mimeType?.includes('word')) {
      return <DocumentIcon className={`${iconClass} text-blue-500`} />;
    }
    if (mimeType?.includes('excel')) {
      return <TableCellsIcon className={`${iconClass} text-green-600`} />;
    }
    if (mimeType?.includes('powerpoint')) {
      return <PresentationChartBarIcon className={`${iconClass} text-orange-500`} />;
    }
    if (mimeType?.includes('video')) {
      return <FilmIcon className={`${iconClass} text-purple-500`} />;
    }
    if (mimeType?.includes('audio')) {
      return <MusicalNoteIcon className={`${iconClass} text-pink-500`} />;
    }
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) {
      return <ArchiveBoxIcon className={`${iconClass} text-purple-600`} />;
    }
    if (mimeType?.includes('text') || mimeType?.includes('code')) {
      return <CodeBracketIcon className={`${iconClass} text-gray-500`} />;
    }
    return <DocumentIcon className={`${iconClass} text-gray-500`} />;
  };

  const getFileTypeLabel = (mimeType) => {
    if (mimeType?.includes('pdf')) return 'PDF Document';
    if (mimeType?.includes('image')) return 'Image File';
    if (mimeType?.includes('word')) return 'Word Document';
    if (mimeType?.includes('excel')) return 'Excel Spreadsheet';
    if (mimeType?.includes('powerpoint')) return 'PowerPoint Presentation';
    if (mimeType?.includes('video')) return 'Video File';
    if (mimeType?.includes('audio')) return 'Audio File';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'Archive File';
    if (mimeType?.includes('text') || mimeType?.includes('code')) return 'Text File';
    return 'Document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cardSize = size === 'large' ? 'p-8' : 'p-4';
  const iconSize = size === 'large' ? 'large' : 'small';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${cardSize}`}>
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          {getFileIcon(file.mimeType, iconSize)}
        </div>
        
        <h3 className={`font-medium text-gray-900 mb-2 ${size === 'large' ? 'text-lg' : 'text-sm'}`}>
          {file.title}
        </h3>
        
        {showDetails && (
          <div className="space-y-1 text-gray-500">
            <p className={`${size === 'large' ? 'text-sm' : 'text-xs'}`}>
              {getFileTypeLabel(file.mimeType)}
            </p>
            {file.size && (
              <p className={`${size === 'large' ? 'text-sm' : 'text-xs'}`}>
                {formatFileSize(file.size)}
              </p>
            )}
            {file.updatedAt && (
              <p className={`${size === 'large' ? 'text-sm' : 'text-xs'}`}>
                Modified {formatDate(file.updatedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreviewCard;
