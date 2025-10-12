const crypto = require('crypto');

/**
 * Generate a unique filename to prevent conflicts
 * @param {string} originalName - The original filename
 * @returns {string} - A unique filename with timestamp and random string
 */
const generateUniqueFilename = (originalName) => {
  if (!originalName) {
    return `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString('hex');
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  // Clean the filename to be safe for file systems
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return `${cleanName}_${timestamp}_${randomString}.${extension}`;
};

module.exports = {
  generateUniqueFilename
};
