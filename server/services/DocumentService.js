const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { prisma } = require('../config/prisma');

class DocumentService {
  /**
   * Generate thumbnail for image files
   */
  static async generateImageThumbnail(filePath, outputPath) {
    try {
      await sharp(filePath)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      
      return true;
    } catch (error) {
      console.error('Error generating image thumbnail:', error);
      return false;
    }
  }

  /**
   * Generate thumbnail for PDF files (first page)
   */
  static async generatePDFThumbnail(filePath, outputPath) {
    try {
      // For now, return false as PDF thumbnail generation requires additional dependencies
      // In production, you'd use pdf-thumbnail or similar
      return false;
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error);
      return false;
    }
  }

  /**
   * Generate thumbnail based on file type
   */
  static async generateThumbnail(assetId) {
    try {
      const asset = await prisma.companyAsset.findUnique({
        where: { id: assetId }
      });
      
      if (!asset || asset.type !== 'FILE') return null;
      
      const filePath = path.join(__dirname, '..', asset.fileUrl);
      const ext = path.extname(asset.fileUrl);
      const thumbnailName = `thumb_${assetId}${ext}`;
      const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
      
      // Ensure thumbnail directory exists
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      const thumbnailPath = path.join(thumbnailDir, thumbnailName);
      const thumbnailUrl = `/uploads/thumbnails/${thumbnailName}`;
      
      let success = false;
      
      // Generate based on mime type
      if (asset.mimeType && asset.mimeType.startsWith('image/')) {
        success = await this.generateImageThumbnail(filePath, thumbnailPath);
      } else if (asset.mimeType === 'application/pdf') {
        success = await this.generatePDFThumbnail(filePath, thumbnailPath);
      }
      
      if (success) {
        // Update asset with thumbnail URL
        await prisma.companyAsset.update({
          where: { id: assetId },
          data: { thumbnailUrl }
        });
        
        return thumbnailUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error in generateThumbnail:', error);
      return null;
    }
  }

  /**
   * Get folder statistics
   */
  static async getFolderStats(folderId) {
    try {
      const stats = await prisma.companyAsset.aggregate({
        where: {
          parentId: folderId,
          isActive: true
        },
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        }
      });
      
      const breakdown = await prisma.companyAsset.groupBy({
        by: ['type'],
        where: {
          parentId: folderId,
          isActive: true
        },
        _count: {
          id: true
        }
      });
      
      return {
        totalItems: stats._count.id || 0,
        totalSize: stats._sum.fileSize || 0,
        folders: breakdown.find(b => b.type === 'FOLDER')?._count.id || 0,
        files: breakdown.find(b => b.type === 'FILE')?._count.id || 0
      };
    } catch (error) {
      console.error('Error getting folder stats:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        folders: 0,
        files: 0
      };
    }
  }

  /**
   * Get user's storage usage
   */
  static async getUserStorageUsage(userId) {
    try {
      const stats = await prisma.companyAsset.aggregate({
        where: {
          uploadedById: userId,
          type: 'FILE',
          isActive: true
        },
        _sum: {
          fileSize: true
        },
        _count: {
          id: true
        }
      });
      
      return {
        totalFiles: stats._count.id || 0,
        totalSize: stats._sum.fileSize || 0,
        formattedSize: this.formatFileSize(stats._sum.fileSize || 0)
      };
    } catch (error) {
      console.error('Error getting user storage:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        formattedSize: '0 B'
      };
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type category
   */
  static getFileCategory(mimeType) {
    if (!mimeType) return 'other';
    
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    
    return 'other';
  }

  /**
   * Check if user has access to asset
   */
  static async checkAccess(assetId, userId, userRole) {
    try {
      const asset = await prisma.companyAsset.findUnique({
        where: { id: assetId },
        select: {
          isPublic: true,
          uploadedById: true,
          accessLevel: true,
          metadata: true
        }
      });
      
      if (!asset) return false;
      
      // Allow all users to access all documents - no access restrictions
      return true;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Move assets to trash (soft delete)
   */
  static async moveToTrash(assetIds, userId) {
    try {
      const result = await prisma.companyAsset.updateMany({
        where: {
          id: { in: assetIds },
          OR: [
            { uploadedById: userId },
            { uploadedBy: { role: 'ADMIN' } }
          ]
        },
        data: {
          isActive: false,
          metadata: {
            trashedAt: new Date().toISOString(),
            trashedBy: userId
          }
        }
      });
      
      return result.count;
    } catch (error) {
      console.error('Error moving to trash:', error);
      throw error;
    }
  }

  /**
   * Restore from trash
   */
  static async restoreFromTrash(assetIds, userId) {
    try {
      const result = await prisma.companyAsset.updateMany({
        where: {
          id: { in: assetIds },
          isActive: false
        },
        data: {
          isActive: true,
          metadata: {
            restoredAt: new Date().toISOString(),
            restoredBy: userId
          }
        }
      });
      
      return result.count;
    } catch (error) {
      console.error('Error restoring from trash:', error);
      throw error;
    }
  }

  /**
   * Permanently delete assets
   */
  static async permanentDelete(assetIds) {
    try {
      // Get assets for file cleanup
      const assets = await prisma.companyAsset.findMany({
        where: {
          id: { in: assetIds },
          isActive: false // Only delete trashed items
        },
        include: {
          versions: true
        }
      });
      
      // Delete from database
      const result = await prisma.companyAsset.deleteMany({
        where: {
          id: { in: assetIds },
          isActive: false
        }
      });
      
      // Clean up files
      for (const asset of assets) {
        // Delete main file
        if (asset.fileUrl) {
          const filePath = path.join(__dirname, '..', asset.fileUrl);
          try {
            await fs.unlink(filePath);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
        
        // Delete thumbnail
        if (asset.thumbnailUrl) {
          const thumbPath = path.join(__dirname, '..', asset.thumbnailUrl);
          try {
            await fs.unlink(thumbPath);
          } catch (err) {
            console.error('Error deleting thumbnail:', err);
          }
        }
        
        // Delete version files
        for (const version of asset.versions) {
          if (version.fileUrl && version.fileUrl !== asset.fileUrl) {
            const versionPath = path.join(__dirname, '..', version.fileUrl);
            try {
              await fs.unlink(versionPath);
            } catch (err) {
              console.error('Error deleting version file:', err);
            }
          }
        }
      }
      
      return result.count;
    } catch (error) {
      console.error('Error in permanent delete:', error);
      throw error;
    }
  }

  /**
   * Get trash items
   */
  static async getTrashItems(userId, userRole) {
    try {
      const where = {
        isActive: false
      };
      
      // Non-admins only see their own trashed items
      if (userRole !== 'ADMIN') {
        where.uploadedById = userId;
      }
      
      const items = await prisma.companyAsset.findMany({
        where,
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });
      
      return items;
    } catch (error) {
      console.error('Error getting trash items:', error);
      return [];
    }
  }

  /**
   * Auto-clean old trash items (30 days)
   */
  static async cleanOldTrash() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldItems = await prisma.companyAsset.findMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: thirtyDaysAgo
          }
        }
      });
      
      const assetIds = oldItems.map(item => item.id);
      
      if (assetIds.length > 0) {
        const deleted = await this.permanentDelete(assetIds);
        console.log(`Auto-cleaned ${deleted} old trash items`);
        return deleted;
      }
      
      return 0;
    } catch (error) {
      console.error('Error in auto-clean:', error);
      return 0;
    }
  }
}

module.exports = DocumentService;
