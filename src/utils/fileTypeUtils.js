/**
 * File type utilities for determining file types and icons
 */

// File type mappings
const FILE_TYPE_MAPPINGS = {
  // Documents
  'application/pdf': { type: 'PDF', icon: '📄', color: 'text-red-500' },
  'application/msword': { type: 'Word', icon: '📝', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'Word', icon: '📝', color: 'text-blue-500' },
  'application/vnd.ms-excel': { type: 'Excel', icon: '📊', color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { type: 'Excel', icon: '📊', color: 'text-green-500' },
  'application/vnd.ms-powerpoint': { type: 'PowerPoint', icon: '📽️', color: 'text-orange-500' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { type: 'PowerPoint', icon: '📽️', color: 'text-orange-500' },
  
  // Images
  'image/jpeg': { type: 'JPEG', icon: '🖼️', color: 'text-purple-500' },
  'image/jpg': { type: 'JPEG', icon: '🖼️', color: 'text-purple-500' },
  'image/png': { type: 'PNG', icon: '🖼️', color: 'text-purple-500' },
  'image/gif': { type: 'GIF', icon: '🖼️', color: 'text-purple-500' },
  'image/svg+xml': { type: 'SVG', icon: '🖼️', color: 'text-purple-500' },
  'image/webp': { type: 'WebP', icon: '🖼️', color: 'text-purple-500' },
  
  // Archives
  'application/zip': { type: 'ZIP', icon: '🗜️', color: 'text-gray-500' },
  'application/x-rar-compressed': { type: 'RAR', icon: '🗜️', color: 'text-gray-500' },
  'application/x-7z-compressed': { type: '7Z', icon: '🗜️', color: 'text-gray-500' },
  
  // Text
  'text/plain': { type: 'Text', icon: '📄', color: 'text-gray-600' },
  'text/csv': { type: 'CSV', icon: '📊', color: 'text-green-600' },
  
  // Code
  'text/javascript': { type: 'JavaScript', icon: '💻', color: 'text-yellow-500' },
  'text/html': { type: 'HTML', icon: '💻', color: 'text-orange-600' },
  'text/css': { type: 'CSS', icon: '💻', color: 'text-blue-600' },
  'application/json': { type: 'JSON', icon: '💻', color: 'text-gray-600' },
  
  // Default
  'default': { type: 'File', icon: '📄', color: 'text-gray-500' }
};

/**
 * Get file type information based on MIME type or file extension
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The file name (used as fallback for extension detection)
 * @returns {object} File type information with type, icon, and color
 */
export const getFileTypeInfo = (mimeType, fileName = '') => {
  // First try MIME type
  if (mimeType && FILE_TYPE_MAPPINGS[mimeType]) {
    return FILE_TYPE_MAPPINGS[mimeType];
  }
  
  // Fallback to file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  const extensionMappings = {
    'pdf': { type: 'PDF', icon: '📄', color: 'text-red-500' },
    'doc': { type: 'Word', icon: '📝', color: 'text-blue-500' },
    'docx': { type: 'Word', icon: '📝', color: 'text-blue-500' },
    'xls': { type: 'Excel', icon: '📊', color: 'text-green-500' },
    'xlsx': { type: 'Excel', icon: '📊', color: 'text-green-500' },
    'ppt': { type: 'PowerPoint', icon: '📽️', color: 'text-orange-500' },
    'pptx': { type: 'PowerPoint', icon: '📽️', color: 'text-orange-500' },
    'jpg': { type: 'JPEG', icon: '🖼️', color: 'text-purple-500' },
    'jpeg': { type: 'JPEG', icon: '🖼️', color: 'text-purple-500' },
    'png': { type: 'PNG', icon: '🖼️', color: 'text-purple-500' },
    'gif': { type: 'GIF', icon: '🖼️', color: 'text-purple-500' },
    'svg': { type: 'SVG', icon: '🖼️', color: 'text-purple-500' },
    'webp': { type: 'WebP', icon: '🖼️', color: 'text-purple-500' },
    'zip': { type: 'ZIP', icon: '🗜️', color: 'text-gray-500' },
    'rar': { type: 'RAR', icon: '🗜️', color: 'text-gray-500' },
    '7z': { type: '7Z', icon: '🗜️', color: 'text-gray-500' },
    'txt': { type: 'Text', icon: '📄', color: 'text-gray-600' },
    'csv': { type: 'CSV', icon: '📊', color: 'text-green-600' },
    'js': { type: 'JavaScript', icon: '💻', color: 'text-yellow-500' },
    'html': { type: 'HTML', icon: '💻', color: 'text-orange-600' },
    'css': { type: 'CSS', icon: '💻', color: 'text-blue-600' },
    'json': { type: 'JSON', icon: '💻', color: 'text-gray-600' }
  };
  
  if (extension && extensionMappings[extension]) {
    return extensionMappings[extension];
  }
  
  // Return default if no match found
  return FILE_TYPE_MAPPINGS['default'];
};

/**
 * Get file type icon component (for use with Heroicons or other icon libraries)
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The file name
 * @returns {string} Icon name or emoji
 */
export const getFileTypeIcon = (mimeType, fileName = '') => {
  const fileInfo = getFileTypeInfo(mimeType, fileName);
  return fileInfo.icon;
};

/**
 * Get file type color class
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The file name
 * @returns {string} Tailwind color class
 */
export const getFileTypeColor = (mimeType, fileName = '') => {
  const fileInfo = getFileTypeInfo(mimeType, fileName);
  return fileInfo.color;
};

/**
 * Get file type name
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The file name
 * @returns {string} Human-readable file type name
 */
export const getFileTypeName = (mimeType, fileName = '') => {
  const fileInfo = getFileTypeInfo(mimeType, fileName);
  return fileInfo.type;
};
